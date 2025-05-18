// 主表QuantumTree创建，自动创建从表NidRegister。
// ElementID是唯一的。是线性的，是可以整理的。这样就需要自己去管理线性分配槽。一类是占用的，另一类是可用的。
// 这样就需要检查后，然后去分配。
// ElementID: path/subpath（superID/subID），结点位置对应表
// ElementID: FileTreeProps（去掉children属性），结点对象对应表

// 查找：找相邻结点、找子结点，找父节点、根据id找结点、根据路径找结点
// 数组下标 关联 结点ID，/ID/ID ->for 取 path 对象结点引用，T.children[i].children[i]
// 若结点有唯一ID，呢么就可以创建一个路径 关联 ID的表。

// 在设计时路径Path不是必要条件

import xmlFormat from 'xml-formatter';
import {Document, DOMParser, Element, NodeList, XMLSerializer} from '@xmldom/xmldom';
import initSqlJs, {Database} from "sql.js";
import {existsSync, readFileSync, writeFileSync} from "fs";
import path from "path";

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
  private registerList = new Set<number>();
  private freeList: number[] = [];

  constructor(table?: number[]) {
    if (!table) return
    table.forEach((value) => {
      this.registerList.add(value);
    });
  }

  applyNid(): string {
    if (this.freeList.length > 0) {
      return String(this.freeList.pop()!);
    }
    for (let i = 0; i < Number.MAX_VALUE; i++) {
      if (!this.registerList.has(i)) {
        this.registerList.add(i);
        return String(i);
      }
    }
    throw new Error("No available ID");
  }

  releaseNid(nid: number) {
    this.registerList.delete(nid);
    this.freeList.push(nid);
  }

  toString() {
    return "Nid: " + [...this.registerList.values()];
  }

  toArray() {
    return [...this.registerList.values()];
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
    node.id = this.nidRegister.applyNid()
    Object.keys(node).map((key) => {
      element.setAttribute(key, node[key]);
    })
    this.findNodeById(nid).appendChild(element)
    return this
  }

  /**
   * 创建条目的兄弟条目
   * @param nid 指定的条目位置
   * @param node 需要创建的条目
   */
  createSiblingOfNode(nid: number, node: Entry) {
    // 必须知道插入或者新建到什么位置
    const element = this.doc.createElement("node")
    node.id = this.nidRegister.applyNid()
    Object.keys(node).map((key) => {
      element.setAttribute(key, node[key]);
    })
    this.findNodeById(nid).parentNode.appendChild(element)
    return this
  }

  /**
   * 连接到父节点：删除指定条目，条目下所以子条目连接到父条目
   * @param nid_target
   */
  removeNode(nid_target: number) {
    // 必须知道删除什么位置的结点,以及怎么删除
    // 删除有清除文件只保留结点标题、连接到父节点、删除子元素三种方式
    const target_node = this.doc.getElementById(nid_target.toString())
    for (const targetNodeElement of target_node.childNodes) {
      target_node.parentNode.appendChild(targetNodeElement.cloneNode(true))
    }
    target_node.parentNode.removeChild(target_node)
    return this
  }

  /**
   * 删除分支，包含此条目以及此条目下所有子条目
   * @param nid
   */
  removeBranch(nid: number) {
    const needDelBranch = this.findNodeById(nid)
    needDelBranch.parentNode.removeChild(needDelBranch)
    return this
  }

  removeNote(nid: number) {
    const needDelNodeOfNote = this.findNodeById(nid)
    needDelNodeOfNote.setAttribute("note", null)
    return this
  }

  /**
   * 移动条目到目标条目下
   * @param sourceNid
   * @param targetNid
   */
  moveNode(sourceNid: number, targetNid: number) {
    // 必须知道移动到什么位置
    // 移动单个结点，移动一个分支，这个没差。统一视为一类
    // 从某个位置移动到某个位置。
    const source_node = this.findNodeById(sourceNid)
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
  sortNode(branchNid: number) {
  }

  findNodeById(nid: number) {
    return this.doc.getElementById(nid.toString())
  }

  /**
   * 树变成表,然后存储
   */
  toTable() {
    let table: EntryLine[] = []

    function buildTable(children: NodeList) {
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as Element
        const entryLine: EntryLine = {id: '', parentId: '', name: ''}
        const parentNode = child.parentNode as Element;
        const parentId = parentNode.getAttribute("id");
        if (parentId === "tree") {
          entryLine["parentId"] = null
        } else {
          entryLine["parentId"] = parentId
        }
        for (let i = 0; i < child.attributes.length; i++) {
          entryLine[child.attributes[i].name] = child.attributes[i].value;
        }
        table.push(entryLine);
        if (child.hasChildNodes()) {
          buildTable(child.childNodes)
        }
      }
    }

    buildTable(this.root.childNodes)
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
    return this
  }

  toString() {
    console.log(xmlFormat(new XMLSerializer().serializeToString(this.doc)))
    console.log(`NidTable: ${this.nidRegister.toArray()}`)
  }
}

class DBService {
  private dbFilePath: string;
  private DB: Database;

  constructor(dbPath: string) {
    this.dbFilePath = path.resolve(dbPath);
  }

  async read() {
    // 如果DBPath下不存在db文件就创建一个新数据库，如果不为空就读取二进制数据库然后构建数据库
    if (!existsSync(this.dbFilePath)) {
      const SQL = await initSqlJs()
      // Create a new database with our existing sample.sqlite file
      this.DB = new SQL.Database();
      // RUNNING SQL QUERIES 👇
      this.DB.run(`create table ADJACENCY
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
      const SQL = await initSqlJs()
      // Create a new database with our existing sample.sqlite file
      const dbFileBuffer = readFileSync(this.dbFilePath);
      this.DB = new SQL.Database(dbFileBuffer)
    }
  }

  getDB(): Database {
    return this.DB;
  }

  async close() {
    //   写出数据库二进制
    writeFileSync(this.dbFilePath, this.DB.export());
    this.dbFilePath = null;
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
entryTree.setNidRegister(new NidRegister([1, 2, 3, 4, 5]))
entryTree.fromTable(flatTable)
let table = entryTree.toTable()
entryTree.fromTable(table)
entryTree.moveNode(3, 6)
entryTree.toString();
entryTree.createChildOfNode(3, {name: '1 Child 1'})
entryTree.toString();

let db = new DBService("D:\\GitHub\\KCMS\\.obsidian\\plugins\\infinite-file-tree\\identifier.sqlite")

async function f() {
  await db.read()
  flatTable.map((item) => {
    db.getDB().run(`INSERT INTO ADJACENCY(id, parentId, name)
                    VALUES (${item.id}, ${item.parentId}, "${item.name}")`)
  })
  await db.close()
}

f().then(r => console.log("finish"))