---
tags:
  - test
  - diagrams
created: 2025-07-01
published: 2025-07-10
---

# Post With Diagrams

A D2 diagram:

```d2
direction: right
Client -> Server: Request
Server -> Database: Query
Database -> Server: Result
Server -> Client: Response
```

A Mermaid diagram:

```mermaid
graph LR
    A[Start] --> B[Process]
    B --> C[End]
```
