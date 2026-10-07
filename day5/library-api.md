# Library API Design

A REST API for a library's **books** resource. Every request and response uses JSON.

A book looks like this:

```json
{
  "id": 12,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "year": 1958,
  "available": true
}
```

## Endpoints

### 1. List all books
- **Method:** GET
- **Path:** `/books`
- **Description:** Returns every book in the library.
- **Request body:** none
- **Success status:** 200 OK

### 2. Get one book
- **Method:** GET
- **Path:** `/books/{id}`
- **Description:** Returns the single book with the given id.
- **Request body:** none
- **Success status:** 200 OK

### 3. Create a book
- **Method:** POST
- **Path:** `/books`
- **Description:** Adds a new book to the library.
- **Example request body:**

  ```json
  {
    "title": "Weep Not, Child",
    "author": "Ngũgĩ wa Thiong'o",
    "year": 1964,
    "available": true
  }
  ```

- **Success status:** 201 Created

### 4. Update a book
- **Method:** PUT
- **Path:** `/books/{id}`
- **Description:** Replaces the details of the book with the given id.
- **Example request body:**

  ```json
  {
    "title": "Weep Not, Child",
    "author": "Ngũgĩ wa Thiong'o",
    "year": 1964,
    "available": false
  }
  ```

- **Success status:** 200 OK

### 5. Delete a book
- **Method:** DELETE
- **Path:** `/books/{id}`
- **Description:** Removes the book with the given id.
- **Request body:** none
- **Success status:** 204 No Content

### 6. List books by an author
- **Method:** GET
- **Path:** `/books?author={name}` (for example `/books?author=Chinua%20Achebe`)
- **Description:** Returns only the books written by the given author, using a query parameter.
- **Request body:** none
- **Success status:** 200 OK (an empty list `[]` if the author has no books)

## Error codes

### 400 Bad Request
- The request is malformed or has invalid data, so the server cannot process it.
- **Example:** `POST /books` with no `title`, or with `"year": "nineteen sixty"` (text instead of a number).

### 404 Not Found
- The resource requested does not exist.
- **Example:** `GET /books/9999` when no book with id 9999 exists. The same applies to `PUT /books/9999` and `DELETE /books/9999`.
