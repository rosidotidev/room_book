INSERT INTO room (id, name, name_key, capacity, active) VALUES
    (1, 'Aurora',   'aurora',   4,  1),
    (2, 'Borealis', 'borealis', 6,  1),
    (3, 'Cirrus',   'cirrus',   8,  1),
    (4, 'Delta',    'delta',    12, 1),
    (5, 'Everest',  'everest',  20, 1),
    (6, 'Fjord',    'fjord',    2,  1);

INSERT INTO room_equipment (room_id, item, item_key) VALUES
    (1, 'Whiteboard',          'whiteboard'),
    (2, 'Projector',           'projector'),
    (2, 'Whiteboard',          'whiteboard'),
    (3, 'Video conferencing',  'video conferencing'),
    (3, 'Whiteboard',          'whiteboard'),
    (4, 'Projector',           'projector'),
    (4, 'Video conferencing',  'video conferencing'),
    (5, 'Projector',           'projector'),
    (5, 'Video conferencing',  'video conferencing'),
    (5, 'Whiteboard',          'whiteboard');
