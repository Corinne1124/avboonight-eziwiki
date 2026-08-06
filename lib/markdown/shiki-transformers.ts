import type { ShikiTransformer } from '@shikijs/types';
import { parseCodeMeta } from './codeMeta';

/**
 * Marks the lines a fence named as the ones worth reading.
 *
 * An example is usually longer than the part of it being discussed, and prose
 * pointing at "the third line" makes the reader count. `{2,4-6}` on the fence
 * says it in the code instead.
 *
 * A Shiki transformer rather than a pass of our own over the tree: Shiki is
 * what knows where one line ends and the next begins, and reconstructing that
 * afterwards from the token spans would be guessing at it.
 *
 * The marked lines keep their syntax colours and take a background, so the
 * emphasis reads as emphasis rather than as a different kind of code. Nothing
 * about it reaches the browser — the class is in the HTML, the colour is in
 * the stylesheet.
 */
export function transformerLineMarks(): ShikiTransformer {
  return {
    name: 'ezw-line-marks',
    line(node, line) {
      // `__raw` is the fence's information line, which `@shikijs/rehype`
      // forwards verbatim.
      const raw = this.options.meta?.__raw;
      if (typeof raw !== 'string') return;

      const { highlights } = parseCodeMeta(raw);
      if (!highlights.includes(line)) return;

      this.addClassToHast(node, 'ezw-line--marked');
    },
  };
}
