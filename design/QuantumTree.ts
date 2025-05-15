// ElementID是唯一的。是线性的，是可以整理的。这样就需要自己去管理线性分配槽。一类是占用的，另一类是可用的。
// 这样就需要检查后，然后去分配。
// ElementID: path/subpath（superID/subID），结点位置对应表
// ElementID: FileTreeProps（去掉children属性），结点对象对应表

// 对于重建对象树的过程，要如何优化？是怎样的顺序？是否可以根据结点位置对应表的值进行排序，然后按照排序后的顺序
// 进行重建对象树？

// 邻接表模型
// +----+----------+-----------+
// | id | name     | parent_id |
// +----+----------+-----------+
// | 1  | Root     | NULL      |
// | 2  | Child 1  | 1         |
// | 3  | Child 2  | 1         |
// | 4  | Grandchild 1 | 2     |
// | 5  | Grandchild 2 | 2     |
// +----+----------+-----------+

// cursor

// // 将邻接表中的每个节点转换为具有children属性的对象
// 遍历这个转换后的对象，如果当前节点是另一个节点的子节点，则将其添加到该节点的children数组中


// tree
// 在某个位置做某件事
// 新建：插入到树中，在结点后创建
// 删除：清除、连接到父节点、删除子元素
// 移动：同子元素一起移动
// 合并
// 修改
// 排序：按层排序

// 查找：找相邻结点、找子结点，找父节点、根据id找结点、根据路径找结点
// 数组下标 关联 结点ID，/ID/ID ->for 取 path 对象结点引用，T.children[i].children[i]

// 表格化、层次化。
// 自己实现、JSDOM、XML.DOM、tree-tool


import {JSDOM} from "jsdom";

interface FileNode {
  title?: string; // 结点名称eid
  type?: string; // 结点类型，
  text: string; // 文本型结点，或者文件路径
  field?: Record<string, string>; // 结点字段
  depth?: number;
  children: FileNode[]; // 子节点。
}

let xml = `
<tree id="root">
    <node id="1" text="1 Child 1">
        <node id="2" text="2 Grandchild 1">
            <node id="3" text="3 Child 3">
                <node id="4" text="4 Grandchild 3"></node>
            </node>
        </node>
    </node>
    <node id="5" text="1 Child 2"></node>
</tree>`

type cursor_line = { id: string, parentId: string, name: string }

const flatArray: cursor_line[] = [
  {id: "1", parentId: "null", name: 'root'},
  {id: "2", parentId: "1", name: '1 Child 1'},
  {id: "3", parentId: "2", name: '2 Grandchild 1'},
  {id: "4", parentId: "3", name: '3 Child 3'},
  {id: "5", parentId: "4", name: '4 Grandchild 3'},
  {id: "6", parentId: "1", name: '1 Child 2'},
];

let empty_xml = `<tree id="root"></tree>`

// @ts-ignore
class QuantumTree {

  createNode() {
    // 必须知道插入或者新建到什么位置
  }

  removeNode() {
    // 必须知道删除什么位置的结点,以及怎么删除
  }

  moveNode() {
    // 必须知道移动到什么位置
  }

  mergeNode() {
    // 必须知道什么和什么合并
  }

  sortNode() {
  }

  findNodeById() {
  }

  findNodeByPath(pathname: string) {
  }

  findParentNode(pathname: string): void;
  findParentNode(node: string) {
  }

  findChildrenNode(pathname: string): void;
  findChildrenNode(node: string) {
  }

  findSiblingNode(pathname: string): void;
  findSiblingNode(node: string) {
  }

  treeToTable() {
    // 树变成表,然后存储
  }

  tableToTree() {
    // 表变成树，然后使用


    const dom = new JSDOM(empty_xml, {contentType: "text/xml",});
    const doc = dom.window.document;

    let root = doc.getElementById("root")
    // let nodes = table.map(cursor_line => {
    //   const no = doc.createElement("node")
    //   no.setAttribute("id", cursor_line[0])
    //   no.setAttribute("name", cursor_line[1])
    //   no.setAttribute("parent_id", cursor_line[2])
    //   return no;
    // })
    // 创建一个映射，方便通过id查找节点
    const map = new Map();
    flatArray.map(cursor_line => {
      const no = doc.createElement("node")
      for (let key of Object.keys(cursor_line)) {
        no.setAttribute(key, cursor_line[key as keyof typeof cursor_line]);
      }
      map.set(cursor_line.id, no);
    })
    console.log(map)

    // 定义一个递归函数，用于构建每个节点的子树
    function buildTree(node: HTMLElement) {
      flatArray.forEach(item => {
        if (item.parentId === node.getAttribute("id")) {
          const childNode = map.get(item.id) as HTMLElement
          node.appendChild(buildTree(childNode));
        }
      })
      return node;
    }
    let elements = flatArray
      .filter(item => item.parentId === "null")
      .map(rootNode => buildTree(map.get(rootNode.id)));
    for (const element of elements) {
      root.appendChild(element)
    }
    console.log(dom.serialize())
    // let find = doc.getElementById("2")

    // for (const findElement of find.children) {
    //   console.log(findElement.getAttribute("text"))
    //   if (findElement.hasChildNodes()) {
    //     console.log(findElement.children[0].getAttribute("text"))
    //   }
    // }
  }
}


class EidRegister {
  // 负责node 的ID的注册，注销
  // 存储一个列表 已注册的内容关联
  // 申请ID，释放ID
}

let tree = new QuantumTree();
tree.tableToTree()
