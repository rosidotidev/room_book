// Parity replay: starts Spring and Nest on fresh database copies, sends requests.json to both in order,
// compares every response, and stops both servers. Run with `npm --prefix backend-nest run parity`.
//
//   node parity/replay.ts                 replay and compare (exit 1 on any difference)
//   node parity/replay.ts --record        replay against Spring only and write recorded-requests.json
//
// Ports: Spring defaults to 8090 and Nest to 8091. Port 8080 is not used because another local process holds it.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { compareExchanges, type Difference } from './compare.ts';
import { LEFT_DB, RIGHT_DB, WORK_DIR, resetCopies } from './reset-copies.ts';

const PACKAGE_DIR = fileURLToPath(new URL('../', import.meta.url));
const BACKEND_DIR = fileURLToPath(new URL('../../backend/', import.meta.url));
const SPRING_DIR = path.join(WORK_DIR, 'spring');
const SPRING_JAR = path.join(SPRING_DIR, 'target', 'roombook-backend-0.1.0.jar');
const REQUESTS_FILE = fileURLToPath(new URL('./requests.json', import.meta.url));
const RECORDED_FILE = fileURLToPath(new URL('./recorded-requests.json', import.meta.url));
const MIN_REQUESTS = 50;

export interface ReplayRequest {
  label: string;
  method: string;
  path: string;
  body?: unknown;
  rawBody?: string;
}

export interface Exchange {
  status: number;
  contentType: string;
  body: string;
}

export async function loadRequests(): Promise<ReplayRequest[]> {
  const requests = JSON.parse(await readFile(REQUESTS_FILE, 'utf8')) as ReplayRequest[];
  if (requests.length < MIN_REQUESTS) {
    throw new Error(`requests.json has ${requests.length} requests; at least ${MIN_REQUESTS} are required.`);
  }
  const labels = new Set(requests.map((r) => r.label));
  if (labels.size !== requests.length) {
    throw new Error('requests.json labels must be unique.');
  }
  return requests;
}

/** Sends the requests one after another, so both sides see the same state sequence. */
export async function replay(baseUrl: string, requests: ReplayRequest[]): Promise<Exchange[]> {
  const exchanges: Exchange[] = [];
  for (const request of requests) {
    const hasBody = request.body !== undefined || request.rawBody !== undefined;
    const response = await fetch(new URL(request.path, baseUrl), {
      method: request.method,
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: request.rawBody ?? (request.body !== undefined ? JSON.stringify(request.body) : undefined),
      signal: AbortSignal.timeout(15000),
    });
    exchanges.push({
      status: response.status,
      contentType: response.headers.get('content-type') ?? '',
      body: await response.text(),
    });
  }
  return exchanges;
}

/** Builds the Spring service from a copy of backend/ (so backend/ itself is never written). */
async function buildSpring(): Promise<void> {
  await rm(SPRING_DIR, { recursive: true, force: true });
  await mkdir(SPRING_DIR, { recursive: true });
  await cp(path.join(BACKEND_DIR, 'src'), path.join(SPRING_DIR, 'src'), { recursive: true });
  for (const entry of ['pom.xml', 'mvnw', 'mvnw.cmd', '.mvn']) {
    await cp(path.join(BACKEND_DIR, entry), path.join(SPRING_DIR, entry), { recursive: true });
  }
  const build =
    process.platform === 'win32'
      ? spawnSync('cmd.exe', ['/c', '.\\mvnw.cmd', '-B', '-q', 'package', '-DskipTests'], { cwd: SPRING_DIR, stdio: 'inherit' })
      : spawnSync('sh', ['./mvnw', '-B', '-q', 'package', '-DskipTests'], { cwd: SPRING_DIR, stdio: 'inherit' });
  if (build.status !== 0 || !existsSync(SPRING_JAR)) {
    throw new Error('Building the Spring reference service failed.');
  }
}

function buildNest(): void {
  const build = spawnSync('npm', ['run', 'build'], { cwd: PACKAGE_DIR, stdio: 'inherit', shell: true });
  if (build.status !== 0) {
    throw new Error('Building backend-nest failed.');
  }
}

function startSpring(port: number, dbPath: string): ChildProcess {
  const url = `jdbc:sqlite:${dbPath.replaceAll('\\', '/')}`;
  return spawn('java', ['-jar', SPRING_JAR, `--server.port=${port}`, `--spring.datasource.url=${url}`], {
    cwd: SPRING_DIR,
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

function startNest(port: number, dbPath: string, clockInstant: string): ChildProcess {
  return spawn(process.execPath, [path.join(PACKAGE_DIR, 'dist', 'main.js')], {
    cwd: PACKAGE_DIR,
    env: {
      ...process.env,
      PORT: String(port),
      ROOMBOOK_DB_PATH: dbPath,
      ROOMBOOK_CLOCK_FIXED_AT: clockInstant,
    },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}

async function waitForHealth(baseUrl: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server at ${baseUrl} exited with code ${child.exitCode} before it became healthy.`);
    }
    try {
      const response = await fetch(new URL('/api/health', baseUrl), { signal: AbortSignal.timeout(2000) });
      if (response.status === 200) {
        return;
      }
    } catch {
      // not listening yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Server at ${baseUrl} did not become healthy in time.`);
}

function stop(child: ChildProcess | undefined): void {
  if (child && child.exitCode === null) {
    child.kill();
  }
}

function describe(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

function report(differences: Difference[]): void {
  for (const d of differences) {
    console.log(`  #${d.index} ${d.label}\n      field: ${d.field}\n      spring: ${describe(d.left)}\n      nest:   ${describe(d.right)}`);
  }
}

interface RecordedRequest extends ReplayRequest {
  index: number;
  expectedStatus: number;
  contentType: string;
  bodyText: string;
}

async function main(): Promise<number> {
  const recordOnly = process.argv.includes('--record');
  const requests = await loadRequests();
  const sourceSum = await resetCopies();
  console.log(`Fresh copies made from backend/data/roombook.db (sha256 ${sourceSum}).`);

  await buildSpring();
  const springUrl = `http://127.0.0.1:${process.env.SPRING_PORT ?? 8090}`;
  const nestUrl = `http://127.0.0.1:${process.env.NEST_PORT ?? 8091}`;
  const springPort = Number(new URL(springUrl).port);
  const nestPort = Number(new URL(nestUrl).port);

  let spring: ChildProcess | undefined;
  let nest: ChildProcess | undefined;
  try {
    spring = startSpring(springPort, LEFT_DB);
    await waitForHealth(springUrl, spring);
    const springExchanges = await replay(springUrl, requests);

    if (recordOnly) {
      const recorded: RecordedRequest[] = requests.map((request, index) => ({
        index,
        ...request,
        expectedStatus: springExchanges[index].status,
        contentType: springExchanges[index].contentType,
        bodyText: springExchanges[index].body,
      }));
      await writeFile(RECORDED_FILE, JSON.stringify(recorded, null, 2) + '\n', 'utf8');
      console.log(`Recorded ${recorded.length} Spring responses to ${RECORDED_FILE}.`);
      return 0;
    }

    // Reference drift: the live Spring answers must still equal the recorded ones.
    let driftCount = 0;
    if (existsSync(RECORDED_FILE)) {
      const recorded = JSON.parse(await readFile(RECORDED_FILE, 'utf8')) as RecordedRequest[];
      recorded.forEach((r, index) => {
        const live = springExchanges[index];
        const drift = compareExchanges(index, r.label, { status: r.expectedStatus, contentType: r.contentType, body: r.bodyText }, live);
        if (drift) {
          driftCount++;
          if (driftCount === 1) console.log('Spring drift against recorded-requests.json:');
          report([drift]);
        }
      });
    }

    buildNest();
    nest = startNest(nestPort, RIGHT_DB, new Date().toISOString());
    await waitForHealth(nestUrl, nest);
    const nestExchanges = await replay(nestUrl, requests);

    const differences: Difference[] = [];
    requests.forEach((request, index) => {
      const diff = compareExchanges(index, request.label, springExchanges[index], nestExchanges[index]);
      if (diff) differences.push(diff);
    });

    console.log(`Compared ${requests.length} requests (Spring on ${springUrl}, Nest on ${nestUrl}).`);
    console.log(`Differences: ${differences.length}. Spring drift vs recorded: ${driftCount}.`);
    report(differences);
    return differences.length === 0 && driftCount === 0 ? 0 : 1;
  } finally {
    stop(nest);
    stop(spring);
  }
}

const code = await main();
process.exitCode = code;
