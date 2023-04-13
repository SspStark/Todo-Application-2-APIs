const express = require("express");
const app = express();
app.use(express.json());
const format = require("date-fns/format");
const isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const path = require("path");
const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http:/localhost:3000/");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};

initializeDBAndServer();

const checkRequestQueries = (request, response, next) => {
  const { search_q, category, priority, status, date } = request.query;
  const { todoId } = request.params;
  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    if (categoryArray.includes(category)) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    if (priorityArray.includes(priority)) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    if (statusArray.includes(status)) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (date !== undefined) {
    try {
      const formatDate = format(new Date(date), "yyyy-MM-dd");
      const myDate = new Date(formatDate);
      if (isValid(myDate) === true) {
        request.date = formatDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.todoId = todoId;
  request.search_q = search_q;

  next();
};

const checkRequestBody = (request, response, next) => {
  const { id, todo, category, priority, status, dueDate } = request.body;
  const { todoId } = request.params;
  if (category !== undefined) {
    const categoryArray = ["WORK", "HOME", "LEARNING"];
    if (categoryArray.includes(category)) {
      request.category = category;
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (priority !== undefined) {
    const priorityArray = ["HIGH", "MEDIUM", "LOW"];
    if (priorityArray.includes(priority)) {
      request.priority = priority;
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (status !== undefined) {
    const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
    if (statusArray.includes(status)) {
      request.status = status;
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (dueDate !== undefined) {
    try {
      const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
      const myDate = new Date(formatDate);
      if (isValid(myDate) === true) {
        request.dueDate = formatDate;
      } else {
        response.status(400);
        response.send("Invalid Due Date");
      }
    } catch (e) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  request.todo = todo;
  request.id = id;
  request.todoId = todoId;

  next();
};

//GET Todos
app.get("/todos", checkRequestQueries, async (request, response) => {
  const { search_q = "", category = "", priority = "", status = "" } = request;
  const getTodos = `select id,todo,priority,status,category,due_date as dueDate 
    from todo where todo like "%${search_q}%" and priority like '%${priority}%'
    and status like '%${status}%'and category like '%${category}%';`;
  const data = await db.all(getTodos);
  response.send(data);
});

//GET Todo
app.get("/todos/:todoId", checkRequestQueries, async (request, response) => {
  const { todoId } = request;
  const getTodo = `
        SELECT 
            id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate
        FROM 
            todo            
        WHERE 
            id = ${todoId};`;

  const todo = await db.get(getTodo);
  response.send(todo);
});

//GET TODO
app.get("/agenda/", checkRequestQueries, async (request, response) => {
  const { date } = request;
  const getTodo = `select id,
            todo,
            priority,
            status,
            category,
            due_date AS dueDate from todo where due_date='${date}';`;
  const data = await db.all(getTodo);
  if (data === undefined) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    response.send(data);
  }
});

//Add Todo
app.post("/todos/", checkRequestBody, async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request;
  const addTodo = `insert into todo(id,todo,priority,status,category,due_date)
    values(${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
  const data = await db.run(addTodo);
  response.send("Todo Successfully Added");
});

//Update Todo
app.put("/todos/:todoId/", checkRequestBody, async (request, response) => {
  const { todoId } = request;
  const requestBody = request.body;
  let updateTodo;
  switch (true) {
    case requestBody.category !== undefined:
      updateTodo = "Category";
      break;
    case requestBody.status !== undefined:
      updateTodo = "Status";
      break;
    case requestBody.todo !== undefined:
      updateTodo = "Todo";
      break;
    case requestBody.priority !== undefined:
      updateTodo = "Priority";
      break;
    case requestBody.dueDate !== undefined:
      updateTodo = "Due Date";
      break;
  }
  const getTodoQuery = `select * from todo where id=${todoId};`;
  const previousTodo = await db.get(getTodoQuery);
  const {
    todo = previousTodo.todo,
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;
  const updateTodoQuery = `update todo set todo='${todo}',status='${status}',priority='${priority}',
    category='${category}',due_date='${dueDate}' where id=${todoId};`;
  await db.run(updateTodoQuery);
  response.send(`${updateTodo} Updated`);
});

//Delete Todo
app.delete("/todos/:todoId", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `delete from todo where id=${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
