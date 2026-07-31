---
title: Secret Demo Page
description: This is a hidden page example - you found it!
order: 99
hidden: true
---

# 🎉 You Found the Secret Page!

![eziwiki](/images/eziwiki.png)

This page is **hidden** from the sidebar navigation, but you can still access it via direct link.

## How Did You Get Here?

You probably:

- Ran `npm run show-urls` and found this URL
- Clicked a link from another page
- Bookmarked this page
- Someone shared the URL with you

## What Makes This Page Special?

This page has `hidden: true` in its frontmatter:

```markdown
---
title: Secret Demo Page
description: This is a hidden page example - you found it!
hidden: true # 👈 This makes it hidden
---
```

That is the whole mechanism — no configuration file involved. See
[[hidden-pages]] for what "hidden" does and does not cover.

## Hidden Page Features

### ✅ Fully Functional

Hidden pages work exactly like regular pages:

- Full Markdown support
- Syntax highlighting
- Images and links
- Dark mode support
- All features available

### ✅ Accessible

Anyone with the URL can access this page:

- Share the link with others
- Bookmark for quick access
- Link from other pages

### ❌ Not in Sidebar

This page won't appear in the sidebar navigation, keeping it "unlisted" but not private.

## Use Cases

Hidden pages are perfect for:

1. **Draft Content** - Work on content before publishing
2. **Internal Docs** - Team-only documentation
3. **Deprecated Pages** - Keep old content accessible
4. **Easter Eggs** - Fun surprises for curious users
5. **Testing** - Test new layouts or features

## Example Code

Here's some code with syntax highlighting:

```typescript
interface HiddenPage {
  name: string;
  path: string;
  hidden: true;
}

const secretPage: HiddenPage = {
  name: 'Secret Demo Page',
  path: 'secret-demo',
  hidden: true,
};

console.log('This page is hidden! 🤫');
```

```python
def find_hidden_pages():
    """Find all hidden pages in the wiki."""
    hidden_pages = []

    for page in all_pages:
        if page.hidden:
            hidden_pages.append(page)

    return hidden_pages

print(f"Found {len(find_hidden_pages())} hidden pages!")
```

## Important Notes

### Not Private

Hidden pages are **unlisted**, not **private**:

- ✅ Anyone with the URL can access
- ✅ Included in the static build
- ✅ Indexed by search engines (by default)
- ❌ NOT password protected

For truly private content, use authentication or don't include in the build.

### Finding This Page

To find all hidden pages:

```bash
npm run show-urls
```

Look for pages marked with 🔒 [HIDDEN].

## Try It Yourself

Create your own hidden page:

1. Create `content/my-secret.md`:

   ```markdown
   ---
   title: My Secret Page
   hidden: true
   ---

   # My Secret Page

   This is my hidden page!
   ```

2. Find the URL:

   ```bash
   npm run show-urls | grep "my-secret"
   ```

3. Share the URL with others!

There is no step for registering the page anywhere — the file is enough.

## Navigation

Want to go back?

- [Home](/intro)
- [Learn About Hidden Pages](/features/hidden-pages)
- [[url-strategies|URL Strategies]]

---

**Pro Tip**: You can link to this page from anywhere in your wiki, even though it's hidden from the sidebar!

```markdown
Check out the [secret demo page](/secret-demo)!
```
