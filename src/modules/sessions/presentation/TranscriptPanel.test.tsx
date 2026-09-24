import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { MarkdownTranscriptBody } from "./TranscriptPanel.tsx";

test("assistant transcript body renders Markdown instead of raw markers", () => {
  const markup = renderToStaticMarkup(
    <MarkdownTranscriptBody
      text={
        "## Result\n\n- **Done**\n- `npm test`\n\n```ts\nconst ok = true;\n```"
      }
    />,
  );

  assert.match(markup, /<h2[^>]*>Result<\/h2>/);
  assert.match(markup, /<strong[^>]*>Done<\/strong>/);
  assert.match(markup, /<code[^>]*>npm test<\/code>/);
  // The chat pipeline highlights code, so the identifier is wrapped in
  // hljs spans; assert on the highlighted block instead of raw source.
  assert.match(
    markup,
    /<pre[^>]*><code[^>]*language-ts[\s\S]*hljs-keyword[\s\S]*ok[\s\S]*true</,
  );
  assert.doesNotMatch(markup, /## Result/);
  assert.doesNotMatch(markup, /\*\*Done\*\*/);
});

test("assistant transcript Markdown strips raw HTML", () => {
  const markup = renderToStaticMarkup(
    <MarkdownTranscriptBody text={'<img src=x onerror="alert(1)">'} />,
  );

  // The chat preset disables raw HTML entirely: the tag is dropped, not
  // rendered as an element and not passed through as escaped text.
  assert.doesNotMatch(markup, /<img/);
  assert.doesNotMatch(markup, /onerror/);
  assert.doesNotMatch(markup, /alert\(1\)/);
});

test("assistant transcript Markdown renders links and hides AiPy metadata comments", () => {
  const markup = renderToStaticMarkup(
    <MarkdownTranscriptBody
      text={
        '[Open docs](https://example.com)\n<!-- aipy_meta: {"kind":"internal"} -->'
      }
    />,
  );

  assert.match(markup, /<a[^>]*href="https:\/\/example\.com"/);
  assert.doesNotMatch(markup, /aipy_meta/);
  assert.doesNotMatch(markup, /<!--/);
});
