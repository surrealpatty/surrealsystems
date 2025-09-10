module.exports = {
  development: {
    username: "root",
    password: "your_mysql_password",
    database: "codecrowds_dev",
    host: "127.0.0.1",
    dialect: "mysql"
  },
  test: {
    username: "root",
    password: "your_mysql_password",
    database: "codecrowds_test",
    host: "127.0.0.1",
    dialect: "mysql"
  },
  production: {
    username: "root",
    password: "your_mysql_password",
    database: "codecrowds_prod",
    host: "127.0.0.1",
    dialect: "mysql"
  }
};
