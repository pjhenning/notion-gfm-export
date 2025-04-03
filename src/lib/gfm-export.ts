import { Client } from "@notionhq/client";
import type { BlockObjectResponse, RichTextItemResponse } from "@notionhq/client/build/src/api-endpoints";
//import dotenv from "dotenv";

function main() {
  //dotenv.config();
  const pageID = '17bddd82c25580f38e27e2376678fe30';
  getMarkdownForPage(pageID, '') // TODO: download file
    .catch((err) => console.error('error attempting to get markdown for page:', err));
}

export async function getMarkdownForPage(pageID: string, notionToken: string) {
  const notion = new Client({
    auth: notionToken,
  });
  
  let {chunks, headers} = await getChunksFromBlock(pageID, notion, false);
  const chunkStrings = resolveLinkRefsAndMergeComponents(chunks);
  const body = chunkStrings.join('');
  const toc = buildTOC(headers);
  return toc + body;
}

enum Content {
  FinalText,
  TextComponents
}

interface Chunk {
  id: string;
  content:
    | {t: Content.FinalText, v: string}
    | {t: Content.TextComponents, v: TextComponent[]};
}

interface Header {
  depth: 1 | 2;
  v: string;
}

function buildTOC(headers: Header[]) {
  return headers.map(h => {
    const indent = h.depth === 1 ? '' : '  ';
    return `${indent}- [${h.v}](#${headerRefFromContent(h.v)})`
  }).join('\n') + '\n';
}

const space = /\s+/g;
const remove = /[().\/\*`]/g;
const anchorLink = /<a id="(\S+)" aria-hidden="true">/;

function tryResolveAnchorRef(candidateBlockSegment: string, refLinkTxt: string) {
  const match = candidateBlockSegment.match(anchorLink);
  if (match !== null) {
    const anchorRefID = match[1];
    return `[${refLinkTxt}](#${anchorRefID})`;
  } else {
    return undefined;
  }
}

function headerRefFromContent(content: string) {
  return content.toLowerCase()
    .trim()
    .replaceAll(space, '-')
    .replaceAll(remove, '');
}

function forceMergeTextComponents(components: TextComponent[]) {
  return components.reduce((merge: string, component) =>
    merge + component.content
  , "")
}

function resolveLinkRefsAndMergeComponents(chunks: Chunk[]): string[] {
  return chunks.map(chunk => {
    const {content} = chunk;
    if (content.t === Content.TextComponents) {
      return content.v.reduce((str: string, textComponent: TextComponent) => {
        if (textComponent.t === TextStatus.Ready) {
          return str + textComponent.content;
        } else {
          const refChunk = chunks.find(c => c.id === textComponent.refID);
          if (refChunk) {
            if (refChunk.content.t === Content.FinalText) {
                if (refChunk.content.v.startsWith('#')) {
                // In this case we have a header
                const formatted = headerRefFromContent(
                  refChunk.content.v.replaceAll('#', '')
                );
                return str + `[${textComponent.content}](#${formatted})`;
              }
              const maybeResolvedLinkString = tryResolveAnchorRef(refChunk.content.v, textComponent.content);
              if (maybeResolvedLinkString) {
                return str + maybeResolvedLinkString;
              } else {
                return `!ERR: couldn't resolve anchor ref for ID '${textComponent.refID}'; for text component with content: "${textComponent.content}"!`;
              }
            } else {
              let maybeResolvedLinkString: string | undefined = undefined;
              for (const refChunkTextComponent of refChunk.content.v) {
                // In this case we have a link to an anonymous block with an anchor link
                maybeResolvedLinkString = tryResolveAnchorRef(refChunkTextComponent.content, textComponent.content);
                if (maybeResolvedLinkString) {
                  break;
                }
              }
              if (maybeResolvedLinkString) {
                return str + maybeResolvedLinkString;
              } else {
                return `!ERR: couldn't resolve anchor ref for ID '${textComponent.refID}'; for text component with content: "${textComponent.content}"!`;
              }
            }
          } else {
            return `!ERR: couldn't find ref chunk with ID '${textComponent.refID}'; for text component with content: "${textComponent.content}"!`;
          }
        }
      }, '');
    } else {
      return content.v;
    }
  });
}

function prependToTextComponents(str: string, textComponents: TextComponent[]): TextComponent[] {
  if (textComponents.length === 0) {
    return [{
      t: TextStatus.Ready,
      content: str
    }];
  } else if (textComponents[0].t === TextStatus.Ready) {
    textComponents[0].content = str + textComponents[0].content;
  } else {
    textComponents.unshift({
      t: TextStatus.Ready,
      content: str
    });
  }
  return textComponents;
}

function appendToTextComponents(str: string, textComponents: TextComponent[]): TextComponent[] {
  if (textComponents.length === 0) {
    return [{
      t: TextStatus.Ready,
      content: str
    }];
  } else if (textComponents[textComponents.length - 1].t === TextStatus.Ready) {
    textComponents[textComponents.length - 1].content = textComponents[textComponents.length - 1].content + str;
  } else {
    textComponents.push({
      t: TextStatus.Ready,
      content: str
    });
  }
  return textComponents;
}

function concatTextComponents(a: TextComponent[], b: TextComponent[]) {
  if (
    a.length > 0 &&
    a[a.length - 1].t === TextStatus.Ready &&
    b.length > 0 &&
    b[0].t === TextStatus.Ready
  ) {
    a[a.length - 1].content = a[a.length - 1].content + b[0].content;
    b.shift();
  }
  return a.concat(b);
}

async function getChunksFromBlock(id: string, client: Client, gettingChildren: boolean, cursor?: string) {
  const pageBlocksResponse =  await client.blocks.children.list({
    block_id: id,
    start_cursor: cursor
  });

  const chunks: Chunk[] = [];

  const addChunk = (v: TextComponent[] | string, {id}: {id: string}) => {
    chunks.push({
      id: id.replaceAll('-', ''),
      content: ({
        t: Array.isArray(v) ? Content.TextComponents : Content.FinalText,
        v
      } as any)
    });
  };

  const headers: Header[] = [];

  let prevWasListItem = false;
  let numberedListItemIndex = 1;
  for (const block of pageBlocksResponse.results) {
    if ('type' in block) {
      let v: TextComponent[] | string = '';
      if (block.type === 'numbered_list_item') {
        const textComponents = processRichText(block.numbered_list_item.rich_text);
        v = prependToTextComponents(`${numberedListItemIndex}. `, textComponents);
        numberedListItemIndex += 1;
        prevWasListItem = true;
      } else {
        if (numberedListItemIndex > 1) numberedListItemIndex = 1;
      }
      if (block.type === 'bulleted_list_item') {
        const textComponents = processRichText(block.bulleted_list_item.rich_text);
        v = prependToTextComponents('- ', textComponents);
      }
      if (
        block.type === 'numbered_list_item' ||
        block.type === 'bulleted_list_item'
      ) {
        prevWasListItem = true;
      } else {
        if (prevWasListItem && !gettingChildren) {
          addChunk('\n', {id: ''});
        }
        prevWasListItem = false;
      }
      if (block.type === 'callout') {
        const {icon} = block.callout;
        let alertKind = null;
        if (icon?.type === 'emoji') {
          alertKind =
            icon.emoji === 'ℹ️' ? 'NOTE' :
            icon.emoji === '💡' ? 'TIP' :
            icon.emoji === '❗' ? 'IMPORTANT' :
            icon.emoji === '⚠️' ? 'WARNING' :
            icon.emoji === '🛑' ? 'CAUTION' :
            'NOTE';
        }
        let prefix = '> '
        if (alertKind !== null) prefix = `> [!${alertKind}]\n${prefix}`;
        const textComponents = processRichText(block.callout.rich_text);
        v = prependToTextComponents(prefix, textComponents);
      }
      if (block.type === 'code') {
        let lang = block.code.language as string;
        if (lang === 'plain text') lang = '';
        v = '```' + `${lang}\n` + block.code.rich_text[0].plain_text + '\n```';
      }
      if (block.type === 'heading_1') {
        const content = forceMergeTextComponents(
          processRichText(block.heading_1.rich_text)
        );
        v = '# ' + content;
        headers.push({depth: 1, v: content});
      }
      if (block.type === 'heading_2') {
        const content = forceMergeTextComponents(
          processRichText(block.heading_2.rich_text)
        );
        v = '## ' + content;
        headers.push({depth: 2, v: content});
      }
      if (block.type === 'heading_3') {
        const content = forceMergeTextComponents(
          processRichText(block.heading_3.rich_text)
        );
        v = '### ' + content;
        //headers.push({depth: 3, v: block.heading_3.rich_text[0].plain_text});
      }
      if (block.type === 'image') {
        if (block.image.type === 'external') {
          const repoMediaDir = 'https://github.com/squinky/intrinsink-hello-world/raw/main/';
          const relativeURL = block.image.external.url.replace(repoMediaDir, '');
          const txt =
            block.image.caption.length > 0 ? block.image.caption[0].plain_text :
            relativeURL.replace('docs/', './');
          v = `![${txt}](${relativeURL})`;
        } else {
          v = '!ERR: skipped image!';
        }
      }
      if (block.type === 'paragraph') {
        v = processRichText(block.paragraph.rich_text);
      }
      if (block.type === 'table') {
        v = await processTable(block.id, client);
      }
      if (block.type === 'unsupported') {
        v = `!ERR: block type is 'unsupported!'`;
      }
      if (block.type === 'video') {
        if (block.video.type === 'external') {
          const {video} = block;
          const url = video.external.url;
          const {caption} = video;
          if (caption.length > 0) {
            const txt = caption[0].plain_text;
            v = `[${txt}](${url})`;
          } else {
            v = url;
          }
        } else {
          v = `!ERR: skipped video with URL "${block.video.file.url}"!`;
        }
      }
      addChunk(v, block);

      if (!gettingChildren) {
        if (
          block.type === 'table' ||
          block.type === 'bulleted_list_item' ||
          block.type === 'numbered_list_item'
        ) {
          addChunk('\n', {id: ''});
        } else if (!(block.type === 'callout' && block.has_children)) {
          addChunk('\n\n', {id: ''});
        }
      }
      if (block.has_children && block.type !== 'table') {

        if (block.type === 'callout') {
          addChunk('\n', {id: ''});
        }

        const childs = await getChunksFromBlock(block.id, client, true);
        const childChunks = processChildChunks(childs.chunks, block.type);
        chunks.push(...childChunks);
        headers.push(...childs.headers);

        if (block.type === 'callout') {
          addChunk('\n', {id: ''});
        } else if (
          block.type !== 'bulleted_list_item' &&
          block.type !== 'numbered_list_item'
        ) {
          addChunk('\n', {id: ''});
        }
      }
    } else {
      addChunk('!ERR: block does not have type!', block);
    }
  }

  if (pageBlocksResponse.has_more) {
    const next = await getChunksFromBlock(id, client, false, pageBlocksResponse.next_cursor!);
    chunks.push(...next.chunks);
    headers.push(...next.headers);
  }

  return {chunks, headers};
}

function processChildChunks(chunks: Chunk[], parentType: BlockObjectResponse['type']): Chunk[] {
  const prefix =
    parentType === 'callout' ? '> ' : '    ';
  return chunks.map(c => {
    if (c.content.t === Content.FinalText) {
      const v = prefix + c.content.v + '\n';
      return {...c, content: {...c.content, v}};
    } else {
      if (c.content.v[0].t === TextStatus.Ready) {
        c.content.v[0].content = prefix + c.content.v[0].content + '\n';
        return c;
      } else {
        c.content.v.unshift({t: TextStatus.Ready, content: prefix + '\n'});
        return c;
      }
    }
  });
}

const anchorPattern = /^\s*<<(\S+)>>/;
enum TextStatus {
  Ready,
  NeedsLinkResolved
}
type TextComponent =
  | {
      t: TextStatus.Ready,
      content: string
    }
  | {
      t: TextStatus.NeedsLinkResolved,
      content: string,
      refID: string
    };

const internalLinkPattern = /^\S+#(\S+)/;
function processRichText(r: RichTextItemResponse[]): TextComponent[] {
  return r.reduce((acc, item) => {
    let content = '';
    let t = TextStatus.Ready;
    let refID = '';
    if (item.type === 'text') {
      content = item.text.content;
      // content = content.replace(refPattern, (_m, g1, g2) => `[${g1.trim()}](${g2})`);
      content = content.replace(anchorPattern, '<a id="$1" aria-hidden="true"></a>');

      const {annotations} = item;
      if (annotations.italic) {
        content = `*${content}*`;
      }
      if (annotations.bold) {
        content = `**${content}**`;
      }
      if (annotations.code) {
        content = '`' + content + '`';
      }
      if (item.text.link !== null) {
        const {url} = item.text.link;
        if (url.startsWith('/')) {
          t = TextStatus.NeedsLinkResolved;
          refID = url.substring(1).replace(internalLinkPattern, '$1');
        } else {
          content = `[${content}](${item.text.link.url})`;
        }
      }
    }
    
    if (t === TextStatus.Ready) {
      const prev = acc[acc.length - 1];
      if (prev && prev.t === TextStatus.Ready) {
        acc[acc.length - 1] = {t, content: prev.content + content};
      } else {
        acc.push({t, content});
      }
    } else {
      acc.push({t, content, refID});
    }
    return acc;
  }, [] as TextComponent[]);
}

async function processTable(tableID: string, client: Client): Promise<TextComponent[]> {
  const childrenResp =  await client.blocks.children.list({block_id: tableID});
  let tableComponents: TextComponent[] = [{
    t: TextStatus.Ready,
    content: ''
  }];
  let headerRow = true;
  for (const child of childrenResp.results) {
    if ('type' in child && child.type === 'table_row') {
      for (const cell of child.table_row.cells) {
        appendToTextComponents('| ',tableComponents);
        tableComponents = concatTextComponents(tableComponents, processRichText(cell));
        appendToTextComponents(' ',tableComponents);
      }
      tableComponents = appendToTextComponents('|\n',tableComponents);

      if (headerRow === true) {
        tableComponents[0].content += '|'
        const delimiter = ' --- |';
        for (let i = 0; i < child.table_row.cells.length; i++) {
          tableComponents[0].content += delimiter;
        }
        tableComponents = appendToTextComponents('\n', tableComponents);
        headerRow = false;
      }
    }
  }
  return tableComponents;
}