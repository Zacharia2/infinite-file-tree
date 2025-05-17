// 主表QuantumTree创建，自动创建从表NidRegister。
// ElementID是唯一的。是线性的，是可以整理的。这样就需要自己去管理线性分配槽。一类是占用的，另一类是可用的。
// 这样就需要检查后，然后去分配。
// ElementID: path/subpath（superID/subID），结点位置对应表
// ElementID: FileTreeProps（去掉children属性），结点对象对应表

// 查找：找相邻结点、找子结点，找父节点、根据id找结点、根据路径找结点
// 数组下标 关联 结点ID，/ID/ID ->for 取 path 对象结点引用，T.children[i].children[i]
// 若结点有唯一ID，呢么就可以创建一个路径 关联 ID的表。

import xmlFormat from 'xml-formatter';
import {Document, DOMParser, Element, NodeList, XMLSerializer} from '@xmldom/xmldom';
import initSqlJs from "sql.js";

interface Entry {
  id: string; //条目ID
  name?: string; //条目名字
  note?: string; //条目对应的笔记
  type?: string; //条目类型
  tag?: string; //条目标签
  field?: string; //文本型json
  [key: string]: string;
}

interface EntryLine extends Entry {
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
  createNode(nid: number, node: Entry) {
    // 必须知道插入或者新建到什么位置
    const element = this.doc.createElement("node")
    node.id = this.nidRegister.applyNid()
    Object.keys(node).map((key) => {
      element.setAttribute(key, node[key]);
    })
    this.doc.getElementById(nid.toString()).parentNode.appendChild(element)
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
        const node: EntryLine = {id: "", parentId: "", text: ""}
        for (let i = 0; i < child.attributes.length; i++) {
          switch (child.attributes[i].name) {
            case "parentId":
              const parentNode = child.parentNode as Element;
              let parentId = parentNode.getAttribute("id");
              if (parentId === "tree") {
                node[child.attributes[i].name] = null
              } else {
                node[child.attributes[i].name] = parentId
              }
              break;
            default:
              node[child.attributes[i].name] = child.attributes[i].value;
          }
        }
        table.push(node);
        if (child.hasChildNodes()) {
          buildTable(child.childNodes)
        }
      }
    }

    buildTable(this.root.childNodes)
    return table
  }

  fromTable(flatTable: Entry[]) {
    // 表变成树，然后使用
    const entryMap = new Map(); // 创建一个映射，方便通过id查找节点
    this.doc = this.dom.parseFromString(this.empty_xml, "text/xml")
    this.root = this.doc.getElementById("tree")
    flatTable.map(line => {
      const entry = this.doc.createElement("node")
      Object.keys(line).map((key) => {
        switch (key) {
          case "id":
            entry.setAttribute(key, line[key].toString());
            break;
          default:
            entry.setAttribute(key, line[key]);
            break;
        }
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


const flatTable: EntryLine[] = [
  {id: "1", parentId: null, text: '1 Child 1'},
  {id: "2", parentId: "1", text: '2 Grandchild 1'},
  {id: "3", parentId: "2", text: '3 Child 3'},
  {id: "4", parentId: "3", text: '4 Grandchild 3'},
  {id: "5", parentId: "4", text: '5 Grandchild 3'},
  {id: "6", parentId: null, text: '1 Child 2'},
];


let entryTree = new EntryTree();
entryTree.setNidRegister(new NidRegister([1, 2, 3, 4, 5])).fromTable(flatTable)
entryTree.moveNode(3, 6)
entryTree.toString();
entryTree.removeNode(3)
entryTree.toString();

initSqlJs().then(function (SQL) {
  // Create a new database with our existing sample.sqlite file
  const db = new SQL.Database();
  // RUNNING SQL QUERIES 👇
  db.run("CREATE TABLE users (id, name, phone, address);");
  db.run(
    `INSERT INTO users (id, name, phone, address)
     VALUES (1, 'John Doe', '+234-907788', '12 Igodan Street, Okitipupa')`
  );
  var data = db.export();
  console.log("data", data);
});