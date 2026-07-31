---
title: Personal Wiki Example
description: Build your own personal knowledge base
order: 1
---

# Personal Wiki Example

![eziwiki](/images/eziwiki.png)

Use eziwiki to build your personal knowledge base - your second brain.

## Use Cases

- **Learning Notes** - Document what you learn
- **Project Documentation** - Track your projects
- **Book Summaries** - Remember what you read
- **Code Snippets** - Save useful code
- **Meeting Notes** - Keep track of discussions
- **Ideas** - Capture and organize thoughts

## Example Structure

Your folder layout _is_ your navigation — nothing to register:

```
content/
├── intro.md
├── learning/
│   ├── _meta.json              → { "name": "📚 Learning", "order": 1 }
│   ├── javascript/
│   │   ├── promises.md
│   │   ├── async-await.md
│   │   └── closures.md
│   └── typescript/
│       ├── generics.md
│       └── utility-types.md
├── projects/
│   ├── _meta.json              → { "name": "💡 Projects", "order": 2 }
│   ├── todo-app.md
│   └── blog-engine.md
└── books/
    ├── _meta.json              → { "name": "📖 Books", "order": 3 }
    └── atomic-habits.md
```

Drop a file in, and it appears. Use `order` in a page's frontmatter to rank it
among its siblings, and `_meta.json` to name and colour the section — see
[[navigation]].

## Example Pages

### Learning Note

```markdown
---
title: JavaScript Promises
description: Understanding promises and async programming
---

# JavaScript Promises

## What are Promises?

A Promise is an object representing the eventual completion or failure of an asynchronous operation.

## Basic Syntax

\`\`\`javascript
const promise = new Promise((resolve, reject) => {
// Async operation
if (success) {
resolve(value);
} else {
reject(error);
}
});
\`\`\`

## Using Promises

\`\`\`javascript
promise
.then(value => console.log(value))
.catch(error => console.error(error))
.finally(() => console.log('Done'));
\`\`\`

## Key Concepts

- **Pending**: Initial state
- **Fulfilled**: Operation completed successfully
- **Rejected**: Operation failed

## Resources

- [MDN Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [JavaScript.info Promises](https://javascript.info/promise-basics)
```

### Project Documentation

```markdown
---
title: Todo App Project
description: Full-stack todo application with React and Node.js
---

# Todo App Project

## Overview

A full-stack todo application built with React, Node.js, and PostgreSQL.

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **Deployment**: Vercel (frontend), Railway (backend)

## Features

- ✅ Create, read, update, delete todos
- ✅ Mark todos as complete
- ✅ Filter by status
- ✅ User authentication
- ✅ Responsive design

## Architecture

\`\`\`
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ React │─────▶│ Express │─────▶│ PostgreSQL │
│ Frontend │◀─────│ Backend │◀─────│ Database │
└─────────────┘ └─────────────┘ └─────────────┘
\`\`\`

## API Endpoints

### GET /api/todos

Get all todos for the current user.

\`\`\`typescript
interface Todo {
id: string;
title: string;
completed: boolean;
createdAt: string;
}
\`\`\`

### POST /api/todos

Create a new todo.

\`\`\`typescript
{
"title": "Buy groceries"
}
\`\`\`

## Lessons Learned

- TypeScript makes refactoring much easier
- Tailwind CSS speeds up development
- PostgreSQL is great for relational data
- Vercel deployment is incredibly simple

## Next Steps

- [ ] Add due dates
- [ ] Add categories/tags
- [ ] Add search functionality
- [ ] Add dark mode
```

### Book Summary

```markdown
---
title: Clean Code by Robert C. Martin
description: Key takeaways and notes
---

# Clean Code

**Author**: Robert C. Martin  
**Published**: 2008  
**Rating**: ⭐⭐⭐⭐⭐

## Key Takeaways

### Meaningful Names

- Use intention-revealing names
- Avoid disinformation
- Make meaningful distinctions
- Use pronounceable names

\`\`\`javascript
// ❌ Bad
const d = new Date();

// ✅ Good
const currentDate = new Date();
\`\`\`

### Functions

- Should be small
- Should do one thing
- Should have descriptive names
- Should have few arguments

\`\`\`javascript
// ❌ Bad
function processUser(name, email, age, address, phone) {
// Too many parameters
}

// ✅ Good
function processUser(user) {
// Single object parameter
}
\`\`\`

### Comments

- Don't comment bad code - rewrite it
- Explain why, not what
- Good code is self-documenting

### Error Handling

- Use exceptions, not error codes
- Don't return null
- Don't pass null

## Favorite Quotes

> "Clean code is simple and direct. Clean code reads like well-written prose."

> "You know you are working on clean code when each routine you read turns out to be pretty much what you expected."

## My Notes

This book changed how I write code. The principles are timeless and apply to any programming language.

## Related

- [Refactoring](/books/refactoring)
- [Design Patterns](/books/design-patterns)
```

### Code Snippet

```markdown
---
title: React Custom Hooks
description: Useful React hooks I've created
---

# React Custom Hooks

## useLocalStorage

Persist state to localStorage:

\`\`\`typescript
import { useState, useEffect } from 'react';

function useLocalStorage<T>(key: string, initialValue: T) {
const [value, setValue] = useState<T>(() => {
const stored = localStorage.getItem(key);
return stored ? JSON.parse(stored) : initialValue;
});

useEffect(() => {
localStorage.setItem(key, JSON.stringify(value));
}, [key, value]);

return [value, setValue] as const;
}

// Usage
const [name, setName] = useLocalStorage('name', 'John');
\`\`\`

## useDebounce

Debounce a value:

\`\`\`typescript
import { useState, useEffect } from 'react';

function useDebounce<T>(value: T, delay: number): T {
const [debouncedValue, setDebouncedValue] = useState(value);

useEffect(() => {
const timer = setTimeout(() => {
setDebouncedValue(value);
}, delay);

    return () => clearTimeout(timer);

}, [value, delay]);

return debouncedValue;
}

// Usage
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 500);
\`\`\`

## useFetch

Simple data fetching:

\`\`\`typescript
import { useState, useEffect } from 'react';

function useFetch<T>(url: string) {
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<Error | null>(null);

useEffect(() => {
fetch(url)
.then(res => res.json())
.then(setData)
.catch(setError)
.finally(() => setLoading(false));
}, [url]);

return { data, loading, error };
}

// Usage
const { data, loading, error } = useFetch<User[]>('/api/users');
\`\`\`
```

## Tips for Personal Wikis

### Keep It Simple

Don't over-organize. Start with a few categories and expand as needed.

### Write for Future You

Write as if you're explaining to yourself in 6 months.

### Link Between Pages

Create connections between related topics.

### Update Regularly

Review and update your notes periodically.

### Use Templates

Create templates for common page types (book summaries, project docs, etc.).

## Next Steps

- [Create Your First Wiki](/getting-started/first-wiki)
- [Learn Markdown Basics](/content/markdown-basics)
- [Customize Your Theme](/configuration/theme)
