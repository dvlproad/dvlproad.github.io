#!/usr/bin/env node
/**
 * 总目录生成器 — 将 catalog.json 渲染为 总目录.md
 *
 * 用法:
 *   node json-to-md.js                          # 正常生成（覆盖 总目录.md）
 *   node json-to-md.js --stdout                 # 输出到控制台
 *   node json-to-md.js --remove-secNum-at-first true   # 清空所有 secNum 后全走自动编号，用于验证编号逻辑
 *
 * --remove-secNum-at-first: 先将 catalog.json 中所有节点的 secNum 删除，
 *   然后全走自动编号流程。配合 --stdout 可对比输出差异。
 */
const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, 'data', 'catalog.json');
const CATALOG_MD = path.resolve(__dirname, '..', '总目录.md');

const SECTION_CONFIG = [
  // header 显示 + 无编号
  { category: 'Architecture架构', depth2Config: { showHeader: false, showHeaderNum: true, flatSub: true }, depth3Config: { showHeader: false, flatSub: true } },
  // header 显示 + 编号
  { category: 'iOS',     depth2Config: { showHeader: true, showHeaderNum: true, flatSub: false }, depth3Config: { showHeader: false, flatSub: true } },
  { category: '常识类',   showChapterNum: true, depth2Config: { showHeader: true, showHeaderNum: true, flatSub: false } },
  // 无章编号 + 节组显示 + 编号
  { category: '工具开发', showChapterNum: false, depth2Config: { showHeader: true, showHeaderNum: true, flatSub: false } },
  { category: '电脑使用', showChapterNum: false, depth2Config: { showHeader: true, showHeaderNum: true, flatSub: false } },
  // 无章编号 + 展示节组但无编号
  { category: 'Script',   showChapterNum: false, depth2Config: { showHeader: true, showHeaderNum: false, showArticleNum: false } },
  { category: '工具实用', showChapterNum: false, singleArticleConfig: { promoteToChapter: false, hideNum: true }, depth2Config: { showHeader: true, showHeaderNum: false } },
  { category: '工具开发', showChapterNum: false, singleArticleConfig: { promoteToChapter: false, hideNum: true }, depth2Config: { showHeader: true, showHeaderNum: false } },
  { category: '工具编程', showChapterNum: false, singleArticleConfig: { promoteToChapter: false, hideNum: true }, depth2Config: { showArticleNum: false } },
  { category: '科学工具', showChapterNum: false, depth2Config: { showArticleNum: false } },
  { category: '专利', showChapterNum: false, depth2Config: { showArticleNum: false } },
  { category: '代码管理', showChapterNum: false, depth2Config: { showHeader: true, showHeaderNum: false } },
];
const SECTION_MAP = new Map(SECTION_CONFIG.map(c => [c.category, c]));
let titleSecMismatches = [];

function arabicToChineseNum(s) {
  const map = { '1': '一', '2': '二', '3': '三', '4': '四', '5': '五', '6': '六', '7': '七', '8': '八', '9': '九', '10': '十' };
  return String(s).replace(/\d+/g, m => map[m] || m);
}
function toChineseNum(n) {
  const d = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  if (n <= 10) return d[n];
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  if (tens === 1) return '十' + (ones > 0 ? d[ones] : '');
  return d[tens] + '十' + (ones > 0 ? d[ones] : '');
}

// 剥离章节名中已有的「第X章：」前缀，只保留名称主体。
// 例如「第一章：Flutter入门」→「Flutter入门」
function stripChapterPrefix(s) {
  return s.replace(/^第[一二三四五六七八九十\d]+章：?/, '');
}

function typeName(node) {
  return (node.type || '').replace(/^\d+/, '');
}

function isReadmeUrl(url) {
  return url.endsWith('/README') || url.endsWith('_README') || url.endsWith(' README');
}

// 获取 depth-0 分组（章）的显示名称。
// 1) 遍历子孙文章 categories，匹配第一个含「第X章：」的元素 → 剥离前缀后返回
// 2) 无匹配 → 返回目录名 chapter.type（原始目录名，如「1入门」）
function getChapterName(chapter) {
  const names = new Set();
  function walk(items) {
    for (const item of items) {
      if (item.categories) {
        for (const c of item.categories) {
          if (/第[一二三四五六七八九十\d]+章：/.test(c)) {
            names.add(c);
          }
        }
      }
      if (item.children) walk(item.children);
    }
  }
  if (chapter.children) walk(chapter.children);
  return names.size > 0 ? [...names][0] : typeName(chapter);
}

// 渲染带标题和子文章编号的分组（虚拟分组/真实子目录共用）
function renderGroupWithHeader(node, depth, lines, sectionType, groupPrefix, secCounter) {
  const indent = '  '.repeat(depth);
  const secNum = node._groupNum || (secCounter ? secCounter.val++ : 1);
  const displayNum = groupPrefix ? groupPrefix + secNum : String(secNum);
  lines.push(`${indent}- 第${displayNum}节：${typeName(node)}`);
  const childPrefix = displayNum + '.';
  let childFlat;
  if (depth >= 2) {
    const d3cfg = SECTION_MAP.get(sectionType)?.depth3Config;
    childFlat = d3cfg && d3cfg.flatSub;
  } else {
    const sc = SECTION_MAP.get(sectionType)?.depth2Config;
    childFlat = sc && sc.flatSub;
  }
  const childDepth = childFlat ? depth : depth + 1;
  let childSeq = 1;
  for (const child of (node.children || [])) {
    const ci = '  '.repeat(childDepth);
    const cleanTitle = (child.title || '').replace(/^第[一二三四五六七八九十\d.]+节[：、]/, '');
    const mark2 = child.hideFromWeb ? ' 🙈' : '';
    lines.push(`${ci}* [第${childPrefix}${childSeq}节：${cleanTitle}](${child.url})${mark2}`);
    childSeq++;
  }
}

function renderNode(node, depth, lines, sectionType, groupPrefix, secCounter) {
  if (node.hidden) return;

  const indent = '  '.repeat(depth);
  const hasChildren = node.children && node.children.length > 0;
  const hasUrl = !!node.url;

  if (node.virtual) {
    if (depth === 0 && node._chapterNum) {
      if (secCounter) { secCounter.val = 1; secCounter.headerVal = 0; }
      lines.push(`${indent}- 第${node._chapterNum}章：${typeName(node)}`);
      for (const child of node.children) {
        renderNode(child, depth + 1, lines, sectionType, null, secCounter);
        advanceSecCounter(child, secCounter);
      }
      return;
    }
    renderGroupWithHeader(node, depth, lines, sectionType, groupPrefix, secCounter);
    return;
  }

  if (hasChildren) {
    const isChapter = depth === 0 && node._chapterNum;
    if (isChapter) {
      if (secCounter) { secCounter.val = 1; secCounter.headerVal = 0; }
      const readmeChild = node.children.find(c => c.url && isReadmeUrl(c.url));
      if (readmeChild) {
        const raw = readmeChild.title;
        const name = stripChapterPrefix(raw);
        lines.push(`${indent}- [第${node._chapterNum}章：${name}](${readmeChild.url})`);
        for (const child of node.children) {
          if (child === readmeChild) continue;
          renderNode(child, depth + 1, lines, sectionType, null, secCounter);
          advanceSecCounter(child, secCounter);
        }
      } else {
        const name = stripChapterPrefix(getChapterName(node));
        lines.push(`${indent}- 第${node._chapterNum}章：${name}`);
        renderChildren(node.children, depth + 1, lines, sectionType, secCounter);
      }
    } else if (depth === 1) {
      const sc = SECTION_MAP.get(sectionType)?.depth2Config;
      if (sc) {
        const readmeChild = node.children.find(c => c.url && isReadmeUrl(c.url));

        const pureArticles = (node.children || []).filter(c => c.url && c !== readmeChild && !c.children);
        const hasSubGroup = (node.children || []).some(c => c.children);

        let secNum;
        let savedCounterVal = null;
        if (sc.showHeader) {
          secNum = secCounter ? ++secCounter.headerVal : 1;
          if (secCounter) secCounter.val = 1;
          if (sc.showHeaderNum) {
            const name = stripChapterPrefix(readmeChild ? readmeChild.title : typeName(node));
            lines.push(`${indent}- 第${secNum}节：${name}`);
          } else {
            const name = readmeChild ? readmeChild.title : typeName(node);
            lines.push(`${indent}- ${name}`);
          }
        } else {
          // 从第一个文章的 secNum 前缀推导基础号，若无则从 secCounter
          const articleChildren = (node.children || []).filter(c => c.url && c !== readmeChild && !c.children);
          const firstSecNum = articleChildren.length > 0 ? articleChildren[0].secNum : null;
          if (firstSecNum && String(firstSecNum).includes('.')) {
            secNum = parseInt(String(firstSecNum).split('.')[0], 10);
            savedCounterVal = secCounter ? Math.max(secCounter.val, secNum + 1) : null;
          } else {
            secNum = secCounter ? secCounter.val++ : 1;
            savedCounterVal = secCounter ? secCounter.val : null;
          }
          if ((!sc.flatSub || !hasSubGroup) && secCounter) secCounter.val = 1;
        }
        const childDepth = sc.flatSub ? depth : depth + 1;
        const prefix = sc.showHeaderNum ? secNum + '.' : null;
        let lastArticleNum = secNum;
        const isFlatArticle = !sc.showHeader && sc.flatSub && hasSubGroup;
        let articleSeq = isFlatArticle ? secNum : null;

        const sectionCfg = SECTION_MAP.get(sectionType);
        const singleArticleGroup = pureArticles.length === 1 && !hasSubGroup && !readmeChild;

        if (sectionCfg?.singleArticleConfig?.hideNum === true && singleArticleGroup) {
          const article = pureArticles[0];
          const ci = '  '.repeat(childDepth);
          lines.push(`${ci}* [${article.title}](${article.url})`);
          if (savedCounterVal !== null && secCounter) {
            secCounter.val = savedCounterVal;
          }
        } else if (sectionCfg?.singleArticleConfig?.promoteToChapter === true && singleArticleGroup) {
          const ci = '  '.repeat(childDepth);
          lines.push(`${ci}* [${typeName(node)}](${pureArticles[0].url})`);
        } else if (!sc.showHeader && pureArticles.length === 1 && !hasSubGroup) {
          const article = pureArticles[0];
          if (article.secNum == null || article.secNum === '') {
            article.secNum = secNum;
          }
          renderNode(article, childDepth, lines, sectionType, null, secCounter);
          if (secCounter) secCounter.val = savedCounterVal;
        } else {
          for (const child of node.children) {
            if (child === readmeChild) continue;
            if (child.children) {
                if (child.virtual) {
                  const d3 = SECTION_MAP.get(sectionType)?.depth3Config;
                  if (d3 && d3.showHeader === false) {
                    for (const gc of child.children) {
                      renderNode(gc, childDepth, lines, sectionType, prefix, secCounter);
                    }
                    const n = secCounter ? secCounter.val - 1 : 0;
                    if (n > lastArticleNum) lastArticleNum = n;
                  } else {
                    renderNode(child, childDepth, lines, sectionType, prefix, secCounter);
                    const n = secCounter ? secCounter.val - 1 : 1;
                    if (n > lastArticleNum) lastArticleNum = n;
                  }
                  } else {
                      const d3 = SECTION_MAP.get(sectionType)?.depth3Config;
                      if (d3 && d3.showHeader === false) {
                          const promotedArticle = (node.children || []).find(c =>
                              c.url && !c.children && c.url.endsWith('/' + child.type)
                          );
                          const hasDepth3SecNum = promotedArticle?.secNum &&
                              String(promotedArticle.secNum).includes('.');
                          if (hasDepth3SecNum) {
                              child._groupNum = parseInt(String(promotedArticle.secNum).split('.').pop(), 10);
                          } else if (sc?.showHeader && !promotedArticle) {
                              child._groupNum = lastArticleNum + 1;
                          }
                           if (!sc?.flatSub && (hasDepth3SecNum || (sc?.showHeader && !promotedArticle))) {
                              const subPrefix = prefix ? prefix + child._groupNum + '.' : String(child._groupNum) + '.';
                              if (secCounter) secCounter.val = 1;
                              for (const gc of child.children) {
                                  renderNode(gc, childDepth, lines, sectionType, subPrefix, secCounter);
                                  const secStr = gc.secNum != null ? String(gc.secNum) : '';
                                  const n = parseInt(secStr.split('.').pop(), 10);
                                  if (!isNaN(n) && n > lastArticleNum) lastArticleNum = n;
                                  if (secCounter && secCounter.val - 1 > lastArticleNum) lastArticleNum = secCounter.val - 1;
                              }
                              if (child._groupNum > lastArticleNum) lastArticleNum = child._groupNum;
                           } else {
                               if (articleSeq !== null) {
                                    const childPrefix = prefix || '';
                                    let childSeq = 1;
                                    for (const gc of child.children) {
                                        gc.secNum = childPrefix + childSeq;
                                        childSeq++;
                                        renderNode(gc, childDepth, lines, sectionType, null, null);
                                    }
                               } else {
                                   for (const gc of child.children) {
                                       renderNode(gc, childDepth, lines, sectionType, prefix, secCounter);
                                       const secStr = gc.secNum != null ? String(gc.secNum) : '';
                                       const n = parseInt(secStr.split('.').pop(), 10);
                                       if (!isNaN(n) && n > lastArticleNum) lastArticleNum = n;
                                       if (secCounter && secCounter.val - 1 > lastArticleNum) lastArticleNum = secCounter.val - 1;
                                   }
                               }
                           }
                      } else {
                          child._groupNum = lastArticleNum + 1;
                          renderGroupWithHeader(child, childDepth, lines, sectionType, prefix, secCounter);
                          if (child._groupNum > lastArticleNum) lastArticleNum = child._groupNum;
                      }
                  }
           } else {
            if (articleSeq !== null) {
                child.secNum = String(articleSeq);
                articleSeq++;
                renderNode(child, childDepth, lines, sectionType, null, secCounter);
                const n = child.secNum ? parseInt(String(child.secNum), 10) : 0;
                if (!isNaN(n) && n > lastArticleNum) lastArticleNum = n;
            } else {
                renderNode(child, childDepth, lines, sectionType, prefix, secCounter);
                const secStr = child.secNum != null ? String(child.secNum) : '';
                const n = parseInt(secStr.split('.').pop(), 10);
                if (!isNaN(n) && n > lastArticleNum) lastArticleNum = n;
                if (secCounter && secCounter.val - 1 > lastArticleNum) lastArticleNum = secCounter.val - 1;
            }
            }
          }
          if (savedCounterVal !== null && secCounter) {
            secCounter.val = savedCounterVal;
          } else if (secCounter && sc.showHeader) {
            secCounter.val = secCounter.headerVal + 1;
          }
        }
      } else {
        const savedVal = secCounter?.val;
        renderSubGroup(node, depth, lines, sectionType, secCounter);
        if (secCounter) secCounter.val = savedVal;
      }
    } else {
      const savedVal = secCounter?.val;
      renderSubGroup(node, depth, lines, sectionType, secCounter);
      if (secCounter) secCounter.val = savedVal;
    }
  } else if (hasUrl) {
    if (node._chapterNum) {
      const mark = node.hideFromWeb ? ' 🙈' : '';
      const cleanTitle = (node.title || '').replace(/^第[一二三四五六七八九十\d.]+节[：、]/, '');
      lines.push(`${indent}- [第${node._chapterNum}章：${cleanTitle}](${node.url})${mark}`);
      return;
    }
    const title = node.title;
    if (isReadmeUrl(node.url)) {
      lines.push(`${indent}* [${title}](${node.url})`);
      return;
    }
    const hasSecInTitle = /^第[一二三四五六七八九十\d.]+[节章][：、]/.test(title);
    const prefix = groupPrefix || '';
    // showArticleNum 控制文章是否显示第X节前缀
    const sc = SECTION_MAP.get(sectionType)?.depth2Config;
    const showArticleNum = sc ? sc.showArticleNum !== false : true;
    let secNum = node.secNum;
    let isAutoNumbered = false;
    // 子分组内带点的 secNum：与 prefix 匹配则保留（故意指定），不匹配则清理（旧自动编号遗留）
    if (prefix && secNum != null && String(secNum).includes('.')) {
      const prefixNum = prefix.replace(/\.$/, '');
      if (String(secNum).startsWith(prefixNum + '.')) {
        if (secCounter) {
          const n = parseInt(String(secNum).split('.').pop(), 10);
          if (!isNaN(n) && secCounter.val <= n) secCounter.val = n + 1;
        }
      } else {
        secNum = null;
      }
    }
    if ((secNum == null || secNum === '') && secCounter) {
      secNum = secCounter.val;
      secCounter.val++;
      isAutoNumbered = true;
    }
    let displaySecNum;
    if (prefix && isAutoNumbered) {
      displaySecNum = prefix + secNum;
    } else {
      displaySecNum = secNum != null ? String(secNum) : '';
    }
    const sec = displaySecNum && !hasSecInTitle && showArticleNum ? `第${displaySecNum}节：` : '';
    const mark = node.hideFromWeb ? ' 🙈' : '';
    if (hasSecInTitle && displaySecNum) {
      const titleMatch = title.match(/^第([一二三四五六七八九十\d.]+)([节章])[：、]/);
      if (titleMatch) {
        const titlePrefix = `第${titleMatch[1]}${titleMatch[2]}`;
        const sysNum = String(displaySecNum);
        const sysPrefix = depth === 0 ? `第${arabicToChineseNum(sysNum)}章` : `第${sysNum}节`;
        if (titlePrefix !== sysPrefix) {
          titleSecMismatches.push({
            url: node.url,
            title: title,
            titleSecNum: titlePrefix,
            systemSecNum: sysPrefix
          });
        }
      }
    }
    const text = `[${sec}${title}](${node.url})`;
    lines.push(`${indent}* ${text}${mark}`);
  }
}

function advanceSecCounter(node, secCounter) {
  if (!secCounter) return;
  if (node.virtual) return;
  if (node.url && node.secNum && /^\d+$/.test(String(node.secNum))) {
    const n = parseInt(node.secNum);
    if (n >= secCounter.val) secCounter.val = n + 1;
  } else if (node.url && node.secNum) {
    const m = String(node.secNum).match(/^(\d+)\./);
    if (m) {
      const n = parseInt(m[1]);
      if (n >= secCounter.val) secCounter.val = n + 1;
    }
  }
}

function renderSubGroup(node, depth, lines, sectionType, secCounter) {
  if (secCounter) secCounter.val = 1;

  const indent = '  '.repeat(depth);
  const readmeChild = node.children.find(c => c.url && isReadmeUrl(c.url));
  if (readmeChild) {
    const title = readmeChild.title;
    lines.push(`${indent}* [${title}](${readmeChild.url})`);
    for (const child of node.children) {
      if (child === readmeChild) continue;
      renderNode(child, depth + 1, lines, sectionType, null, secCounter);
      advanceSecCounter(child, secCounter);
    }
    return;
  }

  // 组头（合并流程图：showHeader/showHeaderNum 默认行为）
  lines.push(`${indent}- ${typeName(node)}`);

  // renderSubGroup 入口预检
  const articles = node.children.filter(c => c.url && !c.children);
  const nonArticles = node.children.filter(c => !c.url || c.children);
  const cfg = SECTION_MAP.get(sectionType);
  const childIndent = '  '.repeat(depth + 1);

  if (cfg?.singleArticleConfig?.hideNum === true && articles.length === 1 && nonArticles.length === 0) {
    lines.push(`${childIndent}* [${articles[0].title}](${articles[0].url})`);
  } else if (cfg?.singleArticleConfig?.promoteToChapter === true && articles.length === 1 && nonArticles.length === 0) {
    lines.push(`${childIndent}* [${typeName(node)}](${articles[0].url})`);
  } else {
    for (const child of node.children) {
      renderNode(child, depth + 1, lines, sectionType, null, secCounter);
      advanceSecCounter(child, secCounter);
    }
  }
}

function renderChildren(children, depth, lines, sectionType, secCounter) {
  for (const child of children) {
    renderNode(child, depth, lines, sectionType, null, secCounter);
    advanceSecCounter(child, secCounter);
  }
}

function renderCatalogToMd(catalog) {
  titleSecMismatches = [];
  const lines = [];
  for (const section of catalog) {
    if (section.hidden) continue;
    lines.push(`## ${section.type}`);
    let chapterNum = 1;
    for (const child of (section.children || [])) {
      if (SECTION_MAP.get(section.type)?.showChapterNum !== false) {
        if (child.url && isReadmeUrl(child.url)) continue;
        child._chapterNum = toChineseNum(chapterNum++);
      }
    }
    const secCounter = {val: 1, headerVal: 0};
    renderChildren(section.children || [], 0, lines, section.type, secCounter);
    lines.push('');
  }
  return lines.join('\n');
}

function readFrontmatter() {
  if (!fs.existsSync(CATALOG_MD)) return null;
  const content = fs.readFileSync(CATALOG_MD, 'utf-8');
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

function now() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function buildFrontmatter(existing) {
  const dateMatch = existing && existing.match(/^date:\s*(.+)$/m);
  const date = dateMatch ? dateMatch[1].trim() : '2019-01-10 18:03:00';
  return [
    '---',
    'title: 总目录',
    `date: ${date}`,
    `updated: ${now()}`,
    'top: 5',
    '---',
    '',
    '[toc]',
    '',
  ].join('\n');
}

function main() {
  const args = process.argv.slice(2);
  const stdoutMode = args.includes('--stdout');
  const optIdx = args.indexOf('--remove-secNum-at-first');
  const removeSecNumFirst = optIdx !== -1 && args[optIdx + 1] === 'true';

  if (!fs.existsSync(INPUT_FILE)) {
    console.error('❌ 未找到 catalog.json: ' + INPUT_FILE);
    console.error('   请先运行 parse-catalog.js 生成 JSON 数据');
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));

  if (removeSecNumFirst) {
    (function stripAllSecNum(items) {
      for (const n of items) {
        delete n.secNum;
        if (n.children) stripAllSecNum(n.children);
      }
    })(data.catalog);
  }

  const existingFm = readFrontmatter();
  const frontmatter = buildFrontmatter(existingFm);
  const body = renderCatalogToMd(data.catalog);
  if (titleSecMismatches.length > 0) {
    console.error('\n=== 标题内嵌编号与系统建议编号不一致 ===');
    for (const m of titleSecMismatches) {
      console.error(`✗ ${m.url}  标题:${m.titleSecNum}  系统建议:${m.systemSecNum}  (${m.title})`);
    }
  }
  const output = frontmatter + body;

  if (stdoutMode) {
    console.log(output);
  } else {
    fs.writeFileSync(CATALOG_MD, output, 'utf-8');
    console.log('✅ 已覆盖 ' + CATALOG_MD);
    console.log('✨ json-to-md.js 处理完成');
  }
}

main();
