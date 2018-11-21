# mysql-migrations

## Table of contents
 - [Prerequisites](#prerequisites)
 - [Install](#install)
 - [Setup](#setup)
 - [Adding Migrations](#adding-migrations)
 - [Executing Migrations](#executing-migrations)

## Prerequisites
A node project with [mysql](https://github.com/mysqljs/mysql) used for database.

## Install
It can be installed using npm.

```
npm install mysql-migrations
```

## Setup
1. Create a directory where you wish to maintain all your migrations. We call it `migrations`.
2. Instantiate mysql-migrations by passing a mysql pool and the migrations directory path.

```
# migration.js
var mysql = require('mysql');
var migration = require('mysql-migrations');

var connection = mysql.createPool({
  connectionLimit : 10,
  host     : 'localhost',
  user     : 'root',
  password : 'password',
  database : 'your_database'
});

migration.init(connection, __dirname + '/migrations');
```

## Adding Migrations

### Initiate a migration
Run `node migration.js add migration create_table_users`. Now open the migrations folder. Locate the newest file with greatest timestamp as it predecessor. The file will have the name which was specified in the command such as `12213545345_create_table_users.js`

### Add migrations
Write the query in `up` key of the json created for the forward migration. As a part of good practice, also write the script to rollback the migration in `down` key. Ex.

```
module.exports = {
    "up": "CREATE TABLE users (user_id INT NOT NULL, UNIQUE KEY user_id (user_id), name TEXT )",
    "down": "DROP TABLE users"
}
```

### Add seed
Run `node migration.js add seed create_table_users` to add a seed.

```
module.exports = {
    "up": "UPDATE users SET name = 'John Snow' WHERE name = ''",
    "down": "UPDATE users SET name = '' WHERE name = 'John Snow'"
}
```

### Initate and Add migration in single command

Run `node migration.js add migration create_table_users "CREATE TABLE mysql_migrations_347ertt3e (user_id INT NOT NULL, UNIQUE KEY user_id (user_id) )"`. Locate the newest file with greatest timestamp as it predecessor and open it. Query will be automatically added as `up` key. However `down` key needs to be filled manually.

### Custom migrations
You may initiate the migration file and add a function.

```
module.exports = {
  'up' :  function (conn, cb) {
    conn.query ("UPDATE users set name = 'alen'", function (err, res) {
      cb();
    });
  },
  'down' : ""
}
```

## Executing Migrations
There are few ways to run migrations.

1. Run `node migration.js up`. Runs all the pending `up` migrations.
2. Run `node migration.js up 2`. Runs 2 pending `up` migrations from the last position.
3. Run `node migration.js down`. Runs only 1 `down` migrations.
4. Run `node migration.js refresh`. Runs all down migrations followed by all up.

### Execute anonymous migrations
At times, few migrations need to run again or anonymously. There could be variety of reasons old migrations need to be executed or rollbacked. It can be done this way.

**Up migration**
```
node migration.js run 1500891087394_create_table_users.js up
```

**Down migration**
```
node migration.js run 1500891087394_create_table_users.js down
```

>> Since these are anonymous executions, no records are maintained for any executions.

## Help and Support
Will be more than happy to improve upon this version. This is an over night build and needs to be improved certainly. Will welcome everyone who wants to contribute.

## Credits and other stuff
It is my first contribution to npm and I am sort of happy over it. I made this when I was really looking for a suitable tool with barebone settings allowing me to maintain database structure. I could not find a basic one and hence wrote my own and finally decided to publish. It took me around 2 hours to write the first version which barely works. But it still does my job.

>>Credits to [ramnique](https://github.com/ramnique/) (I worked with him at Stayzilla and he is a great mentor).

>>And of course to my parents.
