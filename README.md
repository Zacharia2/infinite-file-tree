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
