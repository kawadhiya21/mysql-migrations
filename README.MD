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
1. Create a directory where you wish to maintain all your migrations.
2. Instantiate mysql-migrations by passing a mysql pool. Also mention the migrations directory.

```
# migration.js
var mysql = require('mysql');
var migration = require('mysql-migration');

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
Migrations can be added in two ways.

1. Run `node migration.js add migration create_table_users`. Now open the migrations folder. Locate the newest file with greatest timestamp as it predecessor. Write the query in `up` key of the json created. As a part of good practice, also write the script to undo the migration in `down` key.
2. Run `node migration.js add migration create_table_users "CREATE TABLE mysql_migrations_347ertt3e (user_id INT NOT NULL, UNIQUE KEY user_id (user_id) )"`. Locate the newest file with greatest timestamp as it predecessor and open it. Query will be automatically added as `up` key. However `down` key needs to be filled manually.

## Executing Migrations
There are few ways to run migrations.

1. Run `node migration.js up`. Runs all the pending `up` migrations.
2. Run `node migration.js up 2`. Runs 2 pending `up` migrations from the last position.
3. Run `node migration.js down`. Runs only 1 `down` migrations.

## Help and Support
Will be more than happy to improve upon this version. This is an over night build and needs to be improved certainly. Will welcome everyone who wants to contribute.
