// 主表QuantumTree创建，自动创建从表NidRegister。
// ElementID是唯一的。是线性的，是可以整理的。这样就需要自己去管理线性分配槽。一类是占用的，另一类是可用的。
// 这样就需要检查后，然后去分配。
// ElementID: path/subpath（superID/subID），结点位置对应表
// ElementID: FileTreeProps（去掉children属性），结点对象对应表

// 查找：找相邻结点、找子结点，找父节点、根据id找结点、根据路径找结点
// 数组下标 关联 结点ID，/ID/ID ->for 取 path 对象结点引用，T.children[i].children[i]
// 若结点有唯一ID，呢么就可以创建一个路径 关联 ID的表。

// 在设计时路径Path不是必要条件

// 对于编程来说，语义重要，语义大于某个语言件的构成情况，这就是所谓封装。
// 只要了解某个语言件的语义，呢么他的逻辑构成, 它的更细微层级就不重要，就不需要放大。
// 函数 类 模块 包，每个层次或每个层次的单体的意义就是用更小层次的单位构建当前层次的语义。
// 例如 细胞的语义是由细胞膜细胞核细胞质等构成具有细胞功能的语义。

import xmlFormat from 'xml-formatter';
import {Document, DOMParser, Element, XMLSerializer} from '@xmldom/xmldom';
import initSqlJs, {Database, Statement} from "sql.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import path from "path";
import {pinyin} from "pinyin-pro";

interface Entry {
  id?: string; //条目ID
  name: string; //条目名字
  note?: string; //条目对应的笔记
  type?: string; //条目类型
  tag?: string; //条目标签
  field?: string; //文本型json
  [key: string]: string;
}

interface EntryLine extends Entry {
  id: string; //条目ID
  depth?: string; //条目所在位置深度
  parentId: string; //条目所在父条目ID
}

class NidRegister {
  private freeSet = new Set<number>();
  private registerSet = new Set<number>();

  constructor(table?: number[]) {
    if (!table) return
    table.forEach((value) => {
      this.registerSet.add(value);
    });
  }

  applyNid(): string {
    if (this.freeSet.size > 0) {
      let nid = [...this.freeSet.values()].sort((a, b) => (b - a)).pop()!
      this.freeSet.delete(nid)
      this.registerSet.add(nid);
      return nid.toString();
    }
    for (let nid = 0; nid < Number.MAX_VALUE; nid++) {
      if (!this.registerSet.has(nid)) {
        this.registerSet.add(nid);
        return nid.toString();
      }
    }
    throw new Error("No available ID");
  }

  releaseNid(nid: number) {
    this.registerSet.delete(nid);
    this.freeSet.add(nid);
  }

  copyNidFromTable(flatTable: Entry[]) {
    flatTable.map((entry) => {
      this.registerSet.add(Number(entry.id))
    })
  }

  toString() {
    return "Nid: " + [...this.registerSet.values()];
  }

  toArray() {
    return [...this.registerSet.values()];
  }
}

class EntryTree {
  private doc: Document;
  private root: Element;
  private readonly dom: DOMParser = new DOMParser();
  private readonly empty_xml = `<itree id="tree"></itree>`
  private nidRegister: NidRegister;

  constructor() {
    this.doc = this.dom.parseFromString(this.empty_xml, "text/xml");
    this.root = this.doc.getElementById("tree")
    this.nidRegister = new NidRegister()
  }

  /**
   * 遍历子树队列。
   *     // <-A-X-X-X-B-，循环队列直到队列为0.
   *     // 消耗队列前端，加入队列后端。
   *     // 之所以能够层层深入是因为推入子元素到队列中了。
   *     // 子元素依然会在自己的循环中将子元素的子元素推入队列。
   * @param array 子树列表
   * @param action 对每个元素进行的操作
   * @private
   */
  private static forEachChildTreeQueue(array: any[], action: Function) {
    // const queue: any[] = [...array];
    const queue: { child: Element; depth: number }[] = array.map(child => ({child, depth: 0}));
    let i = 0;
    while (queue.length > 0) {
      // const child = queue[i] as Element;
      const {child, depth} = queue[i] as { child: Element; depth: number };
      action(child, depth);
      if (child.hasChildNodes()) {
        // queue.push(...child.childNodes)
        queue.push(...Array.from(child.childNodes).map(child => ({child: child as Element, depth: depth + 1})));
      }
      queue.shift();
    }
  }

  setNidRegister(nidRegister: NidRegister) {
    this.nidRegister = nidRegister
    return this
  }

  getRoot() {
    return this.root;
  }

  getDocument() {
    return this.doc
  }

  /**
   * 在某个条目下面创建条目
   * @param nid 指定的条目位置
   * @param node 需要创建的条目
   */
  createChildOfNode(nid: number, node: Entry) {
    // 必须知道插入或者新建到什么位置
    const element = this.doc.createElement("node")
    const id = this.nidRegister.applyNid()
    element.setAttribute("id", id);
    Object.keys(node).map((key) => {
      element.setAttribute(key, node[key]);
    })
    this.findNodeById(nid).appendChild(element)
    return Number(id)
  }

  /**
   * 创建条目的兄弟条目
   * @param nid 指定的条目位置
   * @param node 需要创建的条目
   */
  createSiblingOfNode(nid: number, node: Entry) {
    // 必须知道插入或者新建到什么位置
    const element = this.doc.createElement("node")
    const id = this.nidRegister.applyNid()
    element.setAttribute("id", id);
    Object.keys(node).map((key) => {
      element.setAttribute(key, node[key]);
    })
    this.findNodeById(nid).parentNode.appendChild(element)
    return Number(id)
  }

  /**
   * 连接到父节点：删除指定条目，条目下所以子条目连接到父条目
   * @param nid
   */
  removeNode(nid: number) {
    // 必须知道删除什么位置的结点,以及怎么删除
    // 删除有清除文件只保留结点标题、连接到父节点、删除子元素三种方式
    const target_node = this.doc.getElementById(nid.toString())
    for (const targetNodeElement of target_node.childNodes) {
      target_node.parentNode.appendChild(targetNodeElement.cloneNode(true))
    }
    target_node.parentNode.removeChild(target_node)
    this.nidRegister.releaseNid(nid)
    return this
  }

  /**
   * 删除分支，包含此条目以及此条目下所有子条目
   * @param nid
   */
  removeBranch(nid: number) {
    const needDelBranch = this.findNodeById(nid)
    EntryTree.forEachChildTreeQueue([needDelBranch, ...needDelBranch.childNodes], (child: Element) => {
      this.nidRegister.releaseNid(Number(child.getAttribute("id")))
    })
    needDelBranch.parentNode.removeChild(needDelBranch)
    return this
  }

  removeNote(nid: number) {
    const needDelNodeOfNote = this.findNodeById(nid)
    needDelNodeOfNote.setAttribute("note", null)
    return this
  }

  renameNote(nid: number, name: string) {
    const needRenameNote = this.findNodeById(nid)
    needRenameNote.setAttribute("name", name)
  }

  /**
   * 移动选定条目（及子条目，若有子条目）到目标条目下
   * @param selectedNid
   * @param targetNid
   */
  moveNode(selectedNid: number, targetNid: number) {
    const source_node = this.findNodeById(selectedNid)
    const target_node = this.findNodeById(targetNid)
    target_node.appendChild(source_node.cloneNode(true))
    source_node.setAttribute("parentId", targetNid.toString())
    source_node.parentNode.removeChild(source_node)
    return this
  }

  mergeNode() {
    // 必须知道什么和什么合并
  }

  /**
   * 排序是按name根据不同方式，支持中英数字，中文使用首字母，选择分支排序。
   */
  sortBranch(branchNid: number) {
    // 取name前9个字符，对每个字符进行标准化，然后进行排序。
    // 对子元素进行克隆，对克隆后的元素进行排序。
    // 先克隆子元素，然后清空子元素，然后排序克隆的子元素。
    const needSortBranchNode = this.findNodeById(branchNid)
    EntryTree.forEachChildTreeQueue([needSortBranchNode], (needSortBranchNode: Element) => {
      // 克隆选定分支的子元素并映射为列表
      const needSortedClonedNode = [...needSortBranchNode.childNodes].map((value: Element) => value.cloneNode(true) as Element);
      // 清空选定分支的子元素
      [...needSortBranchNode.childNodes].forEach((value: Element) => needSortBranchNode.removeChild(value));
      // 对元素从小到大进行排序
      needSortedClonedNode.sort(function (a, b) {
        // 如果相同就返回0
        if (a.getAttribute("name") == b.getAttribute("name")) return 0
        // 如果不同就取两个元素name最小长度的前九个字符
        // 然后两两按照从小到大进行排列
        const aName = pinyin(a.getAttribute("name"), {
          toneType: "none",
          type: "array"
        }).map((value) => value.slice(0, 1))
        const bName = pinyin(b.getAttribute("name"), {
          toneType: "none",
          type: "array"
        }).map((value) => value.slice(0, 1))
        let name9 = Math.min(aName.length, bName.length)
        if (name9 > 9) name9 = 9
        for (let i = 0; i <= name9; i++) {
          const aChar = aName[i]
          const bChar = bName[i]
          if (aChar === bChar) continue;
          else return aChar > bChar ? -1 : 1
        }
      });
      // 排序好的再依次填充回去
      for (let i = 0; i < needSortedClonedNode.length; ++i) {
        needSortBranchNode.appendChild(needSortedClonedNode[i]);
      }
    })

  }

  findNodeById(nid: number) {
    return this.doc.getElementById(nid.toString())
  }

  /**
   * 树变成表,然后存储
   */
  toTable() {
    let table: EntryLine[] = []
    EntryTree.forEachChildTreeQueue([...this.root.childNodes], (child: Element, depth: number) => {
      const entryLine: EntryLine = {id: '', parentId: '', name: ''}
      const parentNode = child.parentNode as Element;
      const parentId = parentNode.getAttribute("id");
      if (parentId === "tree") {
        entryLine["parentId"] = null
      } else {
        entryLine["parentId"] = parentId
      }
      entryLine["depth"] = String(depth)
      for (let i = 0; i < child.attributes.length; i++) {
        entryLine[child.attributes[i].name] = child.attributes[i].value;
      }
      table.push(entryLine);
    })
    return table
  }

  /**
   * // 表变成树，然后使用
   * @param flatTable
   */
  fromTable(flatTable: Entry[]) {
    const entryMap = new Map(); // 创建一个映射，方便通过id查找节点
    this.doc = this.dom.parseFromString(this.empty_xml, "text/xml")
    this.root = this.doc.getElementById("tree")
    flatTable.map(line => {
      const entry = this.doc.createElement("node")
      Object.keys(line).map((key) => {
        if (key === "parentId") return
        entry.setAttribute(key, line[key]);
      })
      entryMap.set(line.id, entry);
    })

    // 定义一个递归函数，用于构建每个节点的子树
    function buildTree(entry: Element) {
      flatTable.forEach(line => {
        if (line.parentId === entry.getAttribute("id")) {
          const childNode = entryMap.get(line.id)
          entry.appendChild(buildTree(childNode));
        }
      })
      return entry;
    }

    flatTable
      .filter(item => item.parentId === null)
      .map(rootNode => {
        this.root.appendChild(buildTree(entryMap.get(rootNode.id)))
      });
    this.nidRegister.copyNidFromTable(flatTable);
    return this
  }

  toString() {
    console.log(`NidTable: ${this.nidRegister.toArray()}`)
    console.log(xmlFormat(new XMLSerializer().serializeToString(this.doc)) + "\n")
  }
}

class DBService {
  private readonly dbFile: string;
  private db: Database;

  constructor(dbPath: string) {
    this.dbFile = path.resolve(dbPath);
  }

  async read() {
    const SQL = await initSqlJs()
    if (!existsSync(this.dbFile)) {
      this.db = new SQL.Database();
      this.db.run(`create table ADJACENCY
                   (
                       id       TEXT not null
                           primary key,
                       parentId TEXT,
                       name     TEXT,
                       note     TEXT,
                       type     TEXT,
                       tag      TEXT,
                       field    TEXT,
                       depth    TEXT
                   );`);
    } else {
      const dbFileBuffer = readFileSync(this.dbFile);
      this.db = new SQL.Database(dbFileBuffer)
    }
  }

  /**
   * Returns the current Database instance, or null if not loaded.
   */
  getDB(): Database | null {
    return this.db;
  }

  runQuery(sql: string, params: any[] = []) {
    if (!this.db) throw new Error("Database not loaded (local mode).");
    let stmt: Statement | null = null;
    try {
      stmt = this.db.prepare(sql);
      stmt.bind(params);
      stmt.run();
      writeFileSync(this.dbFile, this.db.export());
    } finally {
      if (stmt) stmt.free();
    }
  }

  async getQuery<T extends Record<string, any>>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error("Database not loaded (local mode).");
    let stmt: Statement | null = null;
    try {
      stmt = this.db.prepare(sql);
      stmt.bind(params);
      const results: T[] = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject() as T);
      }
      return results;
    } finally {
      if (stmt) stmt.free();
    }
  }
}


const flatTable: EntryLine[] = [
  {id: "1", parentId: null, name: '1 Child 1'},
  {id: "2", parentId: "1", name: '2 Grandchild 1'},
  {id: "3", parentId: "2", name: '3 Child 3'},
  {id: "4", parentId: "3", name: '4 Grandchild 3'},
  {id: "5", parentId: "4", name: '5 Grandchild 3'},
  {id: "6", parentId: null, name: '1 Child 2'},
];


let entryTree = new EntryTree();
entryTree.fromTable(entryTree.fromTable(flatTable).toTable())
entryTree.createChildOfNode(entryTree.createChildOfNode(1, {name: "Child"}), {name: "Child"})
entryTree.toString();
entryTree.sortBranch(1)
entryTree.toString();

async function TestDB() {
  const db = new DBService("./sqlite.db")
  await db.read()
  flatTable.map((item) => {
    db.runQuery(`INSERT INTO ADJACENCY(id, parentId, name)
                 VALUES (${item.id}, ${item.parentId}, "${item.name}")`)
  })
}

// TestDB().then(r => console.log("finish"))
