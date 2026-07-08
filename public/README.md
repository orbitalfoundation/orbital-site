# public/ — the canonical seed tree for THIS instance

This folder is content, not code. The engines live in their own packages
(orbital-filespace, orbital-server, orbital-site); this tree is the namespace
this particular deployment boots from. Each folder's info.json declares the
folder's own node and names its children — undeclared folders are invisible.
Seeds are initial conditions only: the live store (.filespace/) wins, and
re-seeding never clobbers runtime edits.

As orbital-sim is rescaffolded onto the filespace foundation, its areas land
here as seeds too — this is where the instance's services get arranged.

Run the appliance from the orbital/ root:  npm start
