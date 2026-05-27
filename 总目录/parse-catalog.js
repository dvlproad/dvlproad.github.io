#!/usr/bin/env node
/**
 * 总目录数据生成器
 *
 * 用途：扫描 source/_posts/ 下的 Markdown 文件，读取 总目录.md 的链接顺序，
 *       生成 catalog.json 供 总目录.html 使用。
 *
 * 用法：node source/_posts/总目录/parse-catalog.js
 *
 * 输出：source/_posts/总目录/data/catalog.json
 *
 * 依赖：总目录.md（文章排序来源）、post_asset_folder: true（_config.yml）
 */

const fs = require('fs');
const path = require('path');

const POSTS_DIR = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(__dirname, 'data', 'catalog.json');
const CATALOG_MD = path.join(POSTS_DIR, '总目录.md');

const SKIP_FILES = new Set(['总目录.md', '总目录_PRD.md']);
const HIDDEN_SECTIONS = new Set(['随笔和面试']);

// 虚拟大分类
const VIRTUAL_SECTIONS = [
  { type: '阿里云', children: ['阿里云', '阿里云oss', '阿里云服务器ECS'] },
  { type: '腾讯云', children: ['腾讯云cos1上传'] },
];

// 虚拟章
const VIRTUAL_CHAPTERS = [
  { type: 'AIGC', children: ['AIGC', 'ComfyUI入门'] },
  { type: 'AI Agent', children: ['AI-①Agent & SKILL', 'AI-②Open Design', 'AI-③opencode会话管理'] },
  { type: 'AI Tool', children: ['AI Tool-①cc-switch', 'AI Tool-②cc-connect', 'AI Tool-③cc-notify'] },
  { type: '项目安全', children: ['网络加密', '开发工具的安全性保障', 'app打包保证', '风控相关'] },
  { type: 'iOS', children: ['iOS加固', 'iOS逆向', 'iOS的重签名'] },
  { type: 'Android', children: ['Android合规安全', 'Android加固', 'Android反编译'] },
  { type: '服务器相关', children: ['服务器相关'] },
  { type: '算法', children: ['9算法', '9业务中的算法'] },
  { type: '数学', children: ['数学-三角函数', '数学-三维'] },
];

// 虚拟节
const VIRTUAL_GROUPS = [
  { type: '科学上网', children: [
    '科学上网_ClashX',
    '科学上网_SMS',
    '科学上网_AppleID',
    '科学上网_ModHeader',
    '科学上网_VCC',
  ]},
  { type: '远程控制', children: [
    '远程桌面连接',
    '远程共享文件夹',
  ]},
  { type: 'Mock', children: [
    'Mock基础知识',
    'yapi的使用之Mock篇',
    'yapi的使用之Mock篇2-类型修改',
  ]},
  { type: '账号管理', children: ['账号管理', '苹果设备注册管理'] },
  { type: '通用', children: ['自动化分支信息'] },
  { type: '图片库SDWebImage①缓存', children: [
    'SDWebImage①缓存-①NSCache',
    'SDWebImage①缓存-②缓存原理',
    'SDWebImage①缓存-③缓存不更新问题',
  ]},
  { type: '图片库SDWebImage②请求', children: [
    'SDWebImage②请求-①简介',
    'SDWebImage②请求-②避免重复请求问题',
  ]},
];




function parseYamlFrontmatter(content) {
  const result = {};
  const match = content.match(/^---\s*\n([\s\S]*?)\n(?:---|\.\.\.)/);
  if (!match) return null;

  const lines = match[1].split('\n');
  let currentKey = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const listMatch = trimmed.match(/^-\s+(.*)/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      let val = listMatch[1].trim();
      val = val.replace(/^["']|["']$/g, '');
      result[currentKey].push(val);
      continue;
    }

    const kvMatch = trimmed.match(/^([\w_]+):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let val = kvMatch[2].trim();

      if (!val) {
        result[currentKey] = [];
      } else if (val === 'true') result[currentKey] = true;
      else if (val === 'false') result[currentKey] = false;
      else if (/^\d+$/.test(val)) result[currentKey] = parseInt(val, 10);
      else {
        val = val.replace(/^["']|["']$/g, '');
        result[currentKey] = val;
      }
    }
  }

  return result;
}

function walkDir(dir, relativePath = '') {
  const items = [];
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return items; }

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = relativePath ? relativePath + '/' + entry.name : entry.name;
    if (entry.isDirectory()) {
      items.push(...walkDir(fullPath, relPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      items.push({ fullPath, relPath });
    }
  }
  return items;
}

function getDirPath(relPath) {
  const parts = relPath.replace(/\.md$/i, '').split('/');
  parts.pop();
  return parts;
}

function addToTree(catalog, dirPath, post) {
  if (dirPath.length === 0) return;

  const sectionKey = dirPath[0];
  let section = catalog.find(s => s.type === sectionKey);
  if (!section) {
    section = { type: sectionKey };
    catalog.push(section);
  }

  if (dirPath.length === 1) {
    if (!section.children) section.children = [];
    section.children.push(post);
    return;
  }

  if (!section.children) section.children = [];
  let current = section.children;

  for (let i = 1; i < dirPath.length; i++) {
    const cat = dirPath[i];
    let node = current.find(n => n.type === cat);
    if (!node) {
      node = { type: cat };
      current.push(node);
    }
    if (i < dirPath.length - 1) {
      if (!node.children) node.children = [];
      current = node.children;
    } else {
      if (!node.children) node.children = [];
      node.children.push(post);
    }
  }
}

function buildMdLinkData(mdContent) {
  const positions = new Map(), secNums = new Map(), hideFromWeb = new Map();
  let idx = 0;
  const linkRe = /\[([^\]]*)\]\(((?:[^()]*|\([^()]*\))*)\)/g;
  let m;
  while ((m = linkRe.exec(mdContent)) !== null) {
    let url = m[2].replace(/\.md$/i, '');
    url = url.replace(/^\.\//, '');
    if (!positions.has(url)) {
      positions.set(url, idx++);
      const secMatch = m[1].match(/第((?:\d+\.)*\d+)节/);
      if (secMatch) {
        secNums.set(url, secMatch[1]);
      }
      const afterLink = mdContent.slice(m.index + m[0].length).split('\n')[0];
      if (afterLink.includes('🙈')) {
        hideFromWeb.set(url, true);
      }
    }
  }
  return { positions, secNums, hideFromWeb };
}

function assignPositions(items, positions, secNums, hideFromWeb) {
  for (const item of items) {
    if (item.url) {
      item._pos = positions.has(item.url) ? positions.get(item.url) : Infinity;
      if (secNums.has(item.url)) {
        item.secNum = secNums.get(item.url);
      }
      if (hideFromWeb.has(item.url)) {
        item.hideFromWeb = true;
      }
    } else if (item.children) {
      assignPositions(item.children, positions, secNums, hideFromWeb);
      let min = Infinity;
      for (const c of item.children) {
        if (c._pos < min) min = c._pos;
      }
      item._pos = min;
    } else {
      item._pos = Infinity;
    }
  }
}

function sortByMdPosition(items) {
  items.sort((a, b) => {
    if (a._pos !== b._pos) return a._pos - b._pos;
    const aIsGroup = !!a.children;
    const bIsGroup = !!b.children;
    if (aIsGroup !== bIsGroup) return aIsGroup ? -1 : 1;
    if (!aIsGroup) {
      if ((a.top || 0) !== (b.top || 0)) return (b.top || 0) - (a.top || 0);
      return String(b.date || '').localeCompare(String(a.date || ''));
    }
    return (a.type || '').localeCompare(b.type || '', 'zh-CN');
  });
  for (const item of items) {
    if (item.children) sortByMdPosition(item.children);
  }
}

function stripPos(items) {
  for (const item of items) {
    delete item._pos;
    if (item.children) stripPos(item.children);
  }
}

function cleanupOutput(obj) {
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val === null || val === undefined || (Array.isArray(val) && val.length === 0)) {
      delete obj[key];
    } else if (typeof val === 'object') {
      cleanupOutput(val);
    }
  }
}

function countPostsInTree(items) {
  let count = 0;
  for (const item of items) {
    if (item.url) count++;
    if (item.children) count += countPostsInTree(item.children);
  }
  return count;
}

function markHidden(catalog) {
  for (const s of catalog) {
    if (HIDDEN_SECTIONS.has(s.type)) s.hidden = true;
  }
}

function matchesUrl(nodeUrl, name) {
  return nodeUrl === name || nodeUrl.endsWith('/' + name);
}

function findNodeInTree(items, name) {
  let bestMatch = null;
  let bestDepth = Infinity;
  function walk(items) {
    for (const item of items) {
      if (item.url && matchesUrl(item.url, name)) {
        const depth = item.url.split('/').length;
        if (item.url === name) {
          bestMatch = item;
          bestDepth = 0;
        } else if (bestDepth > 0 && depth < bestDepth) {
          bestMatch = item;
          bestDepth = depth;
        }
      }
      if (!item.url && item.type === name && item.children) {
        if (bestDepth > 1) {
          bestMatch = item;
          bestDepth = 1;
        }
      }
      if (item.children) walk(item.children);
    }
  }
  walk(items);
  return bestMatch;
}

function findNodeInCatalog(catalog, name) {
  let bestMatch = null;
  let bestDepth = Infinity;
  for (const section of catalog) {
    if (!section.children) continue;
    const found = findNodeInTree(section.children, name);
    if (found) {
      if (found.url === name) return found;
      if (!found.url && found.type) {
        if (bestDepth > 0) { bestMatch = found; bestDepth = 0; }
      } else {
        const depth = found.url.split('/').length;
        if (depth < bestDepth) {
          bestMatch = found;
          bestDepth = depth;
        }
      }
    }
  }
  return bestMatch;
}

function applyVirtualNodeGrouping(catalog, groups) {
  for (const group of groups) {
    const memberNodes = group.children
      .map(name => findNodeInCatalog(catalog, name))
      .filter(n => n !== null);

    if (memberNodes.length === 0) continue;

    const memberSet = new Set(memberNodes);

    function findCommonParent(items) {
      for (const item of items) {
        if (!item.children) continue;
        if (memberNodes.every(m => item.children.includes(m))) return item;
        const found = findCommonParent(item.children);
        if (found) return found;
      }
      return null;
    }

    let parentNode = null;
    for (const section of catalog) {
      if (!section.children) continue;
      if (memberNodes.every(m => section.children.includes(m))) {
        parentNode = section; break;
      }
      parentNode = findCommonParent(section.children);
      if (parentNode) break;
    }
    if (!parentNode) continue;

    const virtualNode = { type: group.type, virtual: true, children: [...memberNodes] };

    const parentChildren = parentNode.children;
    const newChildren = [];
    let inserted = false;
    for (const child of parentChildren) {
      if (memberSet.has(child)) {
        if (!inserted) {
          newChildren.push(virtualNode);
          inserted = true;
        }
      } else {
        newChildren.push(child);
      }
    }
    parentChildren.splice(0, parentChildren.length, ...newChildren);
  }
}

function dissolveChapterVirtualGroups(items, depth, skipDissolve) {
  for (const item of items) {
    if (item.children) {
      dissolveChapterVirtualGroups(item.children, (depth || 0) + 1, skipDissolve);
    }
  }

  const parentDepth = depth || 0;
  if (parentDepth === 2 && !skipDissolve) {
    const hasRealSubGroup = items.some(c => !c.virtual && c.children);
    if (!hasRealSubGroup) {
      const flattened = [];
      for (const child of items) {
        if (child.virtual) {
          for (const gc of child.children) {
            if (gc.secNum && typeof gc.secNum === 'string' && gc.secNum.includes('.')) {
              gc.secNum = gc.secNum.split('.').pop();
            }
            flattened.push(gc);
          }
        } else {
          flattened.push(child);
        }
      }
      flattened.sort((a, b) => a._pos - b._pos);
      items.splice(0, items.length, ...flattened);
    }
  }
}

const NO_CHAPTER_SECTIONS = new Set(['Script', '工具实用', '工具开发', '代码管理', '常识类']);

function promoteToVirtualSections(catalog, groups) {
  function removeNodesFromTree(items, memberSet) {
    const filtered = items.filter(c => {
      if (memberSet.has(c)) return false;
      if (c.children) {
        removeNodesFromTree(c.children, memberSet);
        if (c.children.length === 0) return false;
      }
      return true;
    });
    let changed = filtered.length !== items.length;
    items.splice(0, items.length, ...filtered);
    return changed;
  }

  for (const group of groups) {
    const memberNodes = group.children
      .map(name => findNodeInCatalog(catalog, name))
      .filter(n => n !== null);
    if (memberNodes.length === 0) continue;

    const memberSet = new Set(memberNodes);

    for (const section of catalog) {
      if (section.children) {
        removeNodesFromTree(section.children, memberSet);
        if (section.children.length === 0) delete section.children;
      }
    }

    const minPos = Math.min(...memberNodes.map(n => n._pos).filter(p => p < Infinity));
    const virtualSection = { type: group.type, virtual: true, children: [...memberNodes], _pos: minPos };
    catalog.push(virtualSection);
  }
}

function main() {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const mdContent = fs.readFileSync(CATALOG_MD, 'utf-8');
  const { positions, secNums, hideFromWeb } = buildMdLinkData(mdContent);
  console.log('总目录.md 链接数: ' + positions.size);

  const files = walkDir(POSTS_DIR);
  console.log('扫描到 ' + files.length + ' 个 Markdown 文件');

  const catalog = [];
  const untitled = [];

  for (const { fullPath, relPath } of files) {
    if (SKIP_FILES.has(path.basename(relPath))) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf-8');
    const fm = parseYamlFrontmatter(content);
    const url = relPath.replace(/\.md$/i, '');
    const dirPath = getDirPath(relPath);

    const post = {};

    if (fm) {
      post.title = fm.title;
      post.url = url;

      // 检查是否有 paired HTML 资源文件
      var pBasename = path.basename(relPath, '.md');
      var pHtmlDir = path.join(path.dirname(fullPath), pBasename);
      var pHtmlFile = path.join(pHtmlDir, pBasename + '.html');
      if (fs.existsSync(pHtmlFile)) {
        post.htmlUrl = url + '/' + pBasename + '.html';
      }

      if (fm.top !== undefined) post.top = fm.top;

      if (fm.secNum !== undefined) {
        post.secNum = fm.secNum;
      } else {
        post.secNum = null;
      }

      for (const key of Object.keys(fm)) {
        if (!['title', 'date', 'updated', 'categories', 'tags', 'top', 'secNum', 'hideFromWeb'].includes(key)) {
          post[key] = fm[key];
        }
      }
      const rest = ['date', 'updated', 'categories', 'tags'];
      for (const key of rest) {
        if (fm[key] !== undefined) post[key] = fm[key];
      }
      if (fm.hideFromWeb !== undefined) post.hideFromWeb = fm.hideFromWeb;
    } else {
      console.log('  无 frontmatter: ' + relPath);
      post.url = url;
    }

    if (!post.title) {
      untitled.push(relPath);
    }

    if (dirPath.length === 0) {
      console.log('  根目录文件: ' + relPath + '（跳过）');
      continue;
    }

    addToTree(catalog, dirPath, post);
  }

  assignPositions(catalog, positions, secNums, hideFromWeb);
  promoteToVirtualSections(catalog, VIRTUAL_SECTIONS);

  for (const section of catalog) {
    if (section.children) {
      let min = Infinity;
      (function walk(items) {
        for (const c of items) {
          if (c._pos !== undefined && c._pos < min) min = c._pos;
          if (c.children) walk(c.children);
        }
      })(section.children);
      section._pos = min === Infinity ? Infinity : min;
    }
  }

  sortByMdPosition(catalog);

  applyVirtualNodeGrouping(catalog, VIRTUAL_GROUPS);
  applyVirtualNodeGrouping(catalog, VIRTUAL_CHAPTERS);

  for (const section of catalog) {
    if (section.children) {
      dissolveChapterVirtualGroups(section.children, 1, NO_CHAPTER_SECTIONS.has(section.type));
    }
  }

  stripPos(catalog);
  markHidden(catalog);

  const output = { catalog: catalog };
  cleanupOutput(output);

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log('\n✅ 已生成 ' + OUTPUT_FILE);
  console.log('   分类: ' + catalog.length + '（含虚拟分类 ' + catalog.filter(s => s.virtual).length + ' 个）');
  console.log('   文章: ' + countPostsInTree(catalog));
  const hiddenCount = catalog.filter(s => s.hidden).length;
  if (hiddenCount > 0) console.log('   隐藏: ' + hiddenCount + ' 个分类');
  if (untitled.length > 0) {
    console.log('\n⚠️  以下 ' + untitled.length + ' 篇文章缺少 title，需补充 frontmatter：');

    for (const p of untitled) {
      console.log('   ' + p);
    }
  }
  console.log('✨ parse-catalog.js 处理完成');
}

main();
