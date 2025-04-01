# 相对文件树

我需要知道如何调试，读懂代码含义。

我需要实现如下几个功能，

-   树结构
    -   结点有类型、
        -   结点可以有标记。
    -   结点可以是文本结点，无内容。

结点名、结点内容块、结点类型组成结点。

这个树没有文件夹，只有文档结点。

文档结点的存储采用日期存储加索引的形式。

插件必须支持移动端
- tree-item
  - tree-item-self
    - tree-item-icon
    - tree-item-inner
  - tree-item-children

nav-file-title、nav-file-title-content

is-collapsed、style="margin-inline-start: -34px !important; padding-inline-start: 38px !important"

```jsx
// 调用 Tree 组件的示例
const myTree = (
    <Tree
        content="Root"
        children={[
            {
                content: '1 Child 1',
                children: [
                    {
                        content: '2 Grandchild 1',
                        children: [
                            {
                                content: '3 Child 3',
                                children: [
                                    {
                                        content: '4 Grandchild 3',
                                        children: [],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                content: '1 Child 2',
                children: [],
            },
        ]}
    />
);

function Tree(props: { content: string, type?: string, name?: string, depth?: number, children: { content: string, children: any[] }[] }) {
    // 初始化 depth 为 0，如果不是第一次调用，则使用传入的 depth
    const depth = props.depth || 0;
    // 缩进大小，可以根据需要调整
    const indentSize = 2;
    return (
        <>
            <div>
                <div style={{ textIndent: `${depth * indentSize}em` }}>{props.content}</div>
                {props.children.length > 0 &&
                    props.children.map((child, index) => {
                        // 传递当前子元素的 content 和 children 属性
                        return <Tree key={index} depth={depth + 1} content={child.content} children={child.children} />;
                    })}
            </div>
        </>
    );
}
```

用ob重写文件列表如何？使用无限文件树的方式，存储按日期存入。

这个树结点有标记，可以标记concept：/

交互逻辑是采用git跟踪的概念进行

对比专业工具，md的moc有些不好用？

可以采取log的面包屑方式对块节点进行展开

判断对象类型，选择处理函数，然后处理函数迭代子类，在交给判断对象类型，选择处理函数。处理函数但返回值会怎么链接在一起呢？会被列出子元素的调用函数组合在一起。

我悟了，将复杂树可以分解为函数然后函数只有最小意义，这样意义确定后就是可以相互调用，从而处理整个树。


当然，以下是上述Python代码的TypeScript版本。我们将定义一个`TreeNode`类，并实现两个函数：`treeToObjectList`用于将树转换为对象列表，`objectListToTree`用于从对象列表重建树。

运行的时候创建恢复并使用对象树，存储索引的时候使用列表如何？

使用对象列表便于存储到数据库里面，索引数据库，暂时使用json代替

跟踪逻辑是，从已有的添加或者创建新的，然后存储文件到指定日期的文件夹下。然后存储索引到磁盘，存储索引的逻辑是每执行一次树操作存储一次。

保证数据安全

跟踪交互是，选择分支右键然后选择添加已有或新建文件

当然也可以取消跟踪，取消跟踪要不变成离散文件要不就删掉。

```typescript
class TreeNode {
    value: any;
    children: TreeNode[];
    constructor(value: any) {
        this.value = value;
        this.children = [];
    }
}
function treeToObjectList(root: TreeNode | null): any[] {
    if (!root) {
        return [];
    }
    const objectList: any[] = [];
    const queue: TreeNode[] = [root];
    while (queue.length > 0) {
        const current = queue.shift()!;
        objectList.push(current.value);
        queue.push(...current.children);
    }
    return objectList;
}
function objectListToTree(objectList: any[]): TreeNode | null {
    if (objectList.length === 0) {
        return null;
    }
    const root = new TreeNode(objectList[0]);
    const queue: TreeNode[] = [root];
    let i = 1;
    while (queue.length > 0) {
        const current = queue[0]; // 获取队列头部节点，但不弹出
        while (i < objectList.length && objectList[i] !== undefined) {
            const child = new TreeNode(objectList[i]);
            current.children.push(child);
            queue.push(child);
            i++;
        }
        queue.shift(); // 完成当前节点的子节点添加后，弹出队列头部
    }
    return root;
}
// 示例使用
const root = new TreeNode(1);
root.children.push(new TreeNode(2), new TreeNode(3));
root.children[0].children.push(new TreeNode(4), new TreeNode(5));
root.children[1].children.push(new TreeNode(6), new TreeNode(7));
const objectList = treeToObjectList(root);
console.log(objectList); // 输出树的对象列表
const newRoot = objectListToTree(objectList);
console.log(newRoot); // 输出重建的树的根节点
```
在这段TypeScript代码中，我们使用了类`TreeNode`来定义树的节点，每个节点有一个值和一个子节点列表。`treeToObjectList`函数通过层序遍历将树转换为对象列表，而`objectListToTree`函数则从对象列表重建树。我们使用了TypeScript的类型注解来提高代码的可读性和健壮性。
