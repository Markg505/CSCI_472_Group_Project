RBOS Web Deployment Package Preliminary Structure for Team Review.

Includes frontend and backend folders as of 10/25/2025, with some modifications for compatibility made 10/25/2025

Package Structure:

RBOS_Web_Deployment/
├── src/
│   ├── main/
│   │   ├── java/		# Java source code (.java files)
│   │   ├── resources/	# Configuration files, SQLite DB, etc.
│   │   └── webapp/
│   │       ├── WEB-INF/
│   │       │   ├── classes/
│   │       │   ├── lib/
│   │       │   └── web.xml	 # Deployment descriptor
│   │       ├── index.html	# (generated)
│   │       ├── vite.svg	# (generated)
│   │       └── assets/		# Other static assets
├── frontend/		# JS/React source code
│   ├── dist/		# (generated)
│   ├── src/
│   ├── public/
│   ├── node_modules/	# (generated)
│   └── (all other React dev files)
├── build.xml
├── dist/			# Built WAR files (generated)
└── build/			# (generated)