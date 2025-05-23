// 主表QuantumTree创建，自动创建从表NidRegister。
// ElementID是唯一的。是线性的，是可以整理的。这样就需要自己去管理线性分配槽。一类是占用的，另一类是可用的。
// 这样就需要检查后，然后去分配。
// ElementID: path/subpath（superID/subID），结点位置对应表
// ElementID: FileTreeProps（去掉children属性），结点对象对应表

// 查找：找相邻结点、找子结点，找父节点、根据id找结点、根据路径找结点
// 数组下标 关联 结点ID，/ID/ID ->for 取 path 对象结点引用，T.children[i].children[i]
// 若结点有唯一ID，呢么就可以创建一个路径 关联 ID的表。

// 在设计时路径Path不是必要条件

// mergeNode() 必须知道什么和什么合并，将某元素合并到某元素，可以用类方法执行。

// 对于编程来说，语义重要，语义是最核心的东西，语义大于某个语言件的构成情况，这就是所谓封装。
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
  sequence?: string; //条目树的顺序
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

  releaseNid(nid: number): void {
    this.registerSet.delete(nid);
    this.freeSet.add(nid);
  }

  copyNidFromTable(flatTable: Entry[]): void {
    flatTable.map((entry) => {
      this.registerSet.add(Number(entry.id))
    })
  }

  toString(): string {
    return "Nid: " + [...this.registerSet.values()];
  }

  toArray(): number[] {
    return [...this.registerSet.values()];
  }
}

class EntryTree {
  public static readonly FOREST_ID: string = "0"
  private readonly document: Document;
  private readonly forest: Element;
  private readonly dom: DOMParser = new DOMParser();
  // forest 深林，语义为根结点 0 存储着一片深林
  private readonly empty_xml = `<forest id=${EntryTree.FOREST_ID}></forest>`
  private nidRegister: NidRegister;
  private dbService: DBService;

  /**
   * id = 0，为系统保留id，语义为forest深林。深林的子结点为树的Root结点。
   */
  constructor() {
    this.document = this.dom.parseFromString(this.empty_xml, "text/xml");
    this.forest = this.document.getElementById(EntryTree.FOREST_ID)
    this.nidRegister = new NidRegister([Number(EntryTree.FOREST_ID)])
  }

  static visitor(array: any[], action: Function) {
    const queue: { child: Element; depth: number }[] = array.map(child => ({child, depth: 0}));
    while (queue.length > 0) {
      const {child, depth} = queue.shift() as { child: Element; depth: number };
      let isStop: boolean = action(child, depth) || false;
      if (isStop) return
      if (child.hasChildNodes()) {
        queue.push(...Array.from(child.childNodes).map(child => ({child: child as Element, depth: depth + 1})));
      }
    }
  }

  setNidRegister(nidRegister: NidRegister) {
    this.nidRegister = nidRegister
    return this
  }

  /**
   * 准备db服务，用于后面的数据变更。
   * 本结构采用树表分离的方式，共同建构虚拟生长树。其中树表示层级，表表示结点全部信息。
   * @param dbPath
   */
  async prepareDataBase(dbPath: string) {
    this.dbService = new DBService();
    await this.dbService.read(dbPath)
  }

  getRoot(): Element {
    return this.forest;
  }

  getDocument(): Document {
    return this.document
  }

  /**
   * 在某个条目下面创建条目
   * @param nid 指定的条目位置
   * @param entry 需要创建的条目
   */
  async createChildNode(nid: number, entry: Entry): Promise<number> {
    const id = this.nidRegister.applyNid()
    const node = this.document.createElement("node")
    node.setAttribute("id", id);
    node.setAttribute("name", entry.name);
    this.findNodeElementById(nid).appendChild(node)
    const entryLine: EntryLine = {
      id: id.toString(),
      parentId: nid.toString(),
      name: entry.name,
      depth: (await this.getDepthOfNode(Number(id))).toString()
    }
    await this.insertNodeIntoDB(entryLine)
    return Number(id)
  }

  /**
   * 创建条目的兄弟条目
   * @param nid 指定的条目位置
   * @param entry 需要创建的条目
   */
  async createSiblingNode(nid: number, entry: Entry): Promise<number> {
    const id = this.nidRegister.applyNid();
    const parentNode = this.findNodeElementById(nid).parentNode as Element;
    const node = this.document.createElement("node");
    node.setAttribute("id", id);
    node.setAttribute("name", entry.name);
    parentNode.appendChild(node);
    const entryLine: EntryLine = {
      id: id.toString(),
      parentId: parentNode.getAttribute("id"),
      name: entry.name,
      depth: (await this.getDepthOfNode(Number(id))).toString()
    }
    await this.insertNodeIntoDB(entryLine);
    return Number(id);
  }

  /**
   * 连接到父节点：删除指定条目，条目下所以子条目连接到父条目
   * @param nid
   */
  async removeNode(nid: number) {
    const needRemoveNode = this.document.getElementById(nid.toString())
    for (const childNode of needRemoveNode.childNodes) {
      needRemoveNode.parentNode.appendChild(childNode.cloneNode(true))
    }
    needRemoveNode.parentNode.removeChild(needRemoveNode)
    this.nidRegister.releaseNid(nid)
    await this.deleteNodeIntoDB(nid)
  }

  /**
   * 删除分支，包含此条目以及此条目下所有子条目
   * @param nid
   */
  async removeBranch(nid: number) {
    const needRemoveBranch = this.findNodeElementById(nid)
    await this.forEachChildTreeQueue([needRemoveBranch, ...needRemoveBranch.childNodes], async (child: Element) => {
      const id = Number(child.getAttribute("id"))
      this.nidRegister.releaseNid(id)
      await this.deleteNodeIntoDB(id)
    })
    needRemoveBranch.parentNode.removeChild(needRemoveBranch)
  }

  async removeNote(nid: number) {
    const needDelNodeOfNote = this.findNodeElementById(nid)
    needDelNodeOfNote.setAttribute("note", null)
    const entryLine: EntryLine = {
      id: nid.toString(),
      name: null,
    }
    await this.updateNodeIntoDB(entryLine)
  }

  async renameNote(nid: number, name: string): Promise<void> {
    const needRenameNote = this.findNodeElementById(nid)
    needRenameNote.setAttribute("name", name)
    const entryLine: EntryLine = {
      id: nid.toString(),
      name: name,
    }
    await this.updateNodeIntoDB(entryLine)
  }

  /**
   * 移动选定条目（及子条目，若有子条目）到目标条目下
   * @param selectedNid
   * @param targetNid
   */
  async moveNode(selectedNid: number, targetNid: number) {
    const source_node = this.findNodeElementById(selectedNid)
    const target_node = this.findNodeElementById(targetNid)
    target_node.appendChild(source_node.cloneNode(true))
    source_node.parentNode.removeChild(source_node)
    const entryLine: EntryLine = {
      id: selectedNid.toString(),
      name: source_node.getAttribute("name"),
      parentId: targetNid.toString(),
    }
    await this.updateNodeIntoDB(entryLine)
  }

  /**
   * 排序是按name根据不同方式，支持中英数字，中文使用首字母，选择分支排序。
   * 用一个配置文件存储排序方式好了。载入的时候按配置文件排序。
   */
  async sortBranch(branchNid: number): Promise<void> {
    // 取name前9个字符，对每个字符进行标准化，然后进行排序。
    // 对子元素进行克隆，对克隆后的元素进行排序。
    // 先克隆子元素，然后清空子元素，然后排序克隆的子元素。
    const needSortBranchNode = this.findNodeElementById(branchNid)
    await this.forEachChildTreeQueue([needSortBranchNode], (needSortBranchNode: Element) => {
      // 克隆选定分支的子元素并映射为列表
      const needSortedClonedNode = [...needSortBranchNode.childNodes].map((value: Element) => value.cloneNode(true) as Element);
      // 清空选定分支的子元素
      [...needSortBranchNode.childNodes].forEach((value: Element) => needSortBranchNode.removeChild(value));
      // 对元素从小到大进行排序
      needSortedClonedNode.sort(function (a, b) {
        // 如果相同就返回0
        const aNodeName = a.getAttribute("name")
        const bNodeName = b.getAttribute("name")
        if (aNodeName == bNodeName) return 0
        // 如果不同就取两个元素name最小长度的前九个字符
        // 然后两两按照从小到大进行排列
        const aName = pinyin(aNodeName, {
          toneType: "none",
          type: "array"
        }).map((value) => value.slice(0, 1))
        const bName = pinyin(bNodeName, {
          toneType: "none",
          type: "array"
        }).map((value) => value.slice(0, 1))
        let name9 = Math.min(aName.length, bName.length)
        if (name9 > 9) name9 = 9
        for (let i = 0; i < name9; i++) {
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
    await this.refreshEntryTableOrder()
  }

  // 不需要暴露，只需要查表
  async getDepthOfNode(nid: number) {
    const node = this.findNodeElementById(nid)
    let number: { depth: number } = {depth: null}
    await this.forEachChildTreeQueue([...this.forest.childNodes], (child: Element, depth: number) => {
      if (node.getAttribute("id") == child.getAttribute("id")) {
        number.depth = depth
        return true
      }
    })
    return number.depth
  }

  async getNodeAttributeInDB(nid: number, name?: string) {
    if (name) {
      const sql = `SELECT '${name}'
                   FROM ADJACENCY
                   WHERE id = '${nid}';`
      return Array.from(await this.dbService.getQuery(sql)).map(line => line as EntryLine)
    } else {
      const sql = `SELECT *
                   FROM ADJACENCY
                   WHERE id = '${nid}';`
      return Array.from(await this.dbService.getQuery(sql)).map(line => line as EntryLine)
    }
  }

  /**
   * 从笔记属性更新条目字段。
   * 从ob中读取属性，转换为json对象，然后序列化json，最后更新field字段
   * @param nid 条目id
   * @param attr 笔记属性对象
   */
  async updateNodeField(nid: number, attr: object) {
    const node = this.findNodeElementById(nid)
    if (node.hasAttribute("note")) {
      const notePath = node.getAttribute("note")
      if (existsSync(notePath)) {
        const entryLine: EntryLine = {
          id: nid.toString(),
          name: node.getAttribute("name"),
          field: JSON.stringify(attr)
        }
        await this.updateNodeIntoDB(entryLine)
      }
    }
  }

  findNodeElementById(nid: number): Element {
    return this.document.getElementById(nid.toString())
  }

  toString() {
    console.log(`NidTable: ${this.nidRegister.toArray()}`)
    console.log(xmlFormat(new XMLSerializer().serializeToString(this.document)) + "\n")
  }

  /**
   * 将数据库导出为EntryArray
   */
  async toEntryArray(): Promise<EntryLine[]> {
    const sql = `SELECT *
                 FROM ADJACENCY;`
    return Array.from(await this.dbService.getQuery(sql)).map(line => line as EntryLine)
  }

  async refreshEntryTableOrder() {
    //   这个负责更新数据库中条目的顺序列的值，依据是DOM树中的顺序。
    //   @buildTreeFromDatabase()配合按order顺序读取。
    let order: number = 1
    await this.forEachChildTreeQueue([...this.forest.childNodes], async (child: Element) => {
      const entryLine: EntryLine = {
        id: child.getAttribute("id"),
        name: child.getAttribute("name"),
        sequence: order.toString(),
      }
      await this.updateNodeIntoDB(entryLine)
      order++
    })
  }

  async refreshEntryTableDepth() {
    await this.forEachChildTreeQueue([...this.forest.childNodes], async (child: Element) => {
      const entryLine: EntryLine = {
        id: child.getAttribute("id"),
        name: child.getAttribute("name"),
        depth: (await this.getDepthOfNode(Number(child.getAttribute("id")))).toString(),
      }
      await this.updateNodeIntoDB(entryLine)
    })
  }

  /**
   * 使EntryArray表变成稀疏DOM树并将完整数据条目到数据库
   * @param flatTable
   */
  fromEntryArrayBuildTree(flatTable: EntryLine[]) {
    const entryMap = new Map(); // 创建一个映射，方便通过id查找节点
    flatTable.map(async line => {
      if (line.id == EntryTree.FOREST_ID) throw new Error("id = 0，为系统保留id，语义为forest深林。");
      const entry = this.document.createElement("node")
      entry.setAttribute("id", line.id);
      entry.setAttribute("name", line.name);
      entryMap.set(line.id, entry);
      await this.insertNodeIntoDB(line)
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
      .filter(item => item.parentId === null || item.parentId === "null")
      .map(rootNode => {
        this.forest.appendChild(buildTree(entryMap.get(rootNode.id)))
      });
    this.nidRegister.copyNidFromTable(flatTable);
    return this
  }

  /**
   * 从数据库中读取数据，仅使用id、name列用于构建和排序树。
   */
  async fromDatabaseBuildTree() {
    const entryMap = new Map(); // 创建一个映射，方便通过id查找节点
    const sql = `SELECT id, parentId, name
                 FROM ADJACENCY
                 ORDER BY sequence;`
    let flatTable = Array.from(await this.dbService.getQuery(sql)).map(line => line as Entry)
    flatTable.map(line => {
      if (line.id == EntryTree.FOREST_ID) throw new Error("id = 0，为系统保留id，语义为forest深林。");
      const entry = this.document.createElement("node")
      entry.setAttribute("id", line.id);
      entry.setAttribute("name", line.name);
      entryMap.set(line.id, entry);
    })

    flatTable
      .filter(item => item.parentId === null || item.parentId === "null")
      .map(rootNode => {
        const queue: any[] = [entryMap.get(rootNode.id)]
        while (queue.length > 0) {
          const entry = queue.shift() as Element;
          flatTable.forEach(line => {
            if (line.parentId === entry.getAttribute("id")) {
              const entryNode = entryMap.get(line.id)
              entry.appendChild(entryNode);
              queue.push(entryNode);
            }
          })
        }
        this.forest.appendChild(entryMap.get(rootNode.id))
      });
    this.nidRegister.copyNidFromTable(flatTable);
    return this
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
  private async forEachChildTreeQueue(array: any[], action: Function): Promise<void> {
    // const queue: any[] = [...array];
    const queue: { child: Element; depth: number }[] = array.map(child => ({child, depth: 0}));
    while (queue.length > 0) {
      // const child = queue[i] as Element;
      const {child, depth} = queue.shift() as { child: Element; depth: number };
      let isStop: boolean = await action(child, depth) || false;
      if (isStop) return
      if (child.hasChildNodes()) {
        // queue.push(...child.childNodes)
        queue.push(...Array.from(child.childNodes).map(child => ({child: child as Element, depth: depth + 1})));
      }
    }
  }

  private async updateNodeIntoDB(entryLine: EntryLine) {
    const compileSqlTupleArray = Object.keys(entryLine).map((key) => [key, entryLine[key]] as [key: string, value: string])
    const compileSqlSetValues = compileSqlTupleArray.map((value) => `${value[0]} = '${value[1]}'`).join(", ")
    const sql = `UPDATE ADJACENCY
                 SET ${compileSqlSetValues}
                 WHERE id = '${entryLine.id}';`
    await this.dbService.runQuery(sql)
  }

  private async insertNodeIntoDB(entryLine: EntryLine, force?: boolean): Promise<void> {
    const compileSqlTupleArray = Object.keys(entryLine).map((key) => [key, entryLine[key]] as [key: string, value: string])
    let id = compileSqlTupleArray.filter(value => value[0] === "id")[0][1]
    const sql_ids = `SELECT id
                     FROM ADJACENCY;`
    let ids = Array.from(await this.dbService.getQuery(sql_ids)).map(line => line as Entry).filter(value => value.id === id)
    if (ids.length <= 0) {
      const compileSqlLine = compileSqlTupleArray.map((value) => value[0]).join(", ")
      const compileSqlValue = compileSqlTupleArray.map((value) => `'${value[1]}'`).join(", ")
      const sql = `INSERT INTO ADJACENCY (${compileSqlLine})
                   VALUES (${compileSqlValue});`
      await this.dbService.runQuery(sql)
    } else if (force) {
      // 若为force 强制更新此id的条目数据
      await this.updateNodeIntoDB(entryLine)
    } else {
      console.log(`数据库中已经存在id: ${id}`)
    }
  }

  private async deleteNodeIntoDB(nid: number): Promise<void> {
    const sql = `DELETE
                 FROM ADJACENCY
                 WHERE id = '${nid}';`
    await this.dbService.runQuery(sql)
  }
}

class DBService {
  private dbFile: string;
  private db: Database;

  async read(dbPath: string) {
    const SQL = await initSqlJs()
    this.dbFile = path.resolve(dbPath);
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
                       depth    TEXT,
                       sequence TEXT
                   );`);
    } else {
      const dbFileBuffer = readFileSync(this.dbFile);
      this.db = new SQL.Database(dbFileBuffer)
    }
    return this.db;
  }

  async runQuery(sql: string, params: any[] = []) {
    if (!this.db) throw new Error("Database not loaded.");
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
    if (!this.db) throw new Error("Database not loaded.");
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

async function TestDB() {
  let entryTree = new EntryTree();
  await entryTree.prepareDataBase("./sqlite.db")
  await entryTree.fromDatabaseBuildTree()
  // entryTree.fromEntryArrayBuildTree(flatTable)
  // entryTree.toString();
  // let a = await entryTree.createChildNode(1, {name: "Child"})
  // let b = await entryTree.createChildNode(a, {name: "Child"})
  // await entryTree.toString();
  await entryTree.sortBranch(1)
  entryTree.toString();
  // console.log(entryTree.getDepthOfNode(5))
}

// entryTree只用于表示树形结构和排序只需要id、name，而数据用DB查询修改，是否可以
// 根据树生成树，然后根据树结点同步数据表，这样树中的每个结点都是一个数据表中的记录。
TestDB().then(r => console.log("finish"))
