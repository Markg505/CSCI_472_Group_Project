RBOS Web Deployment Package.

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