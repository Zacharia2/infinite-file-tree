interface FileTreeProps {
    content: string;
    type?: string;
    name?: string;
    depth?: number;
    children: FileTreeProps[];
}
function WorkspaceLeafContent(props: {}) {
    return (
        <div className="workspace-leaf-content" data-type="file-explorer">
            <NavHeader></NavHeader>
            <NavFilesContainer></NavFilesContainer>
        </div>
    );
}
function NavHeader(props: {}) {
    return (
        <div className="nav-header">
            <div className="nav-buttons-container">
                <div className="clickable-icon nav-action-button" aria-label="新建笔记"></div>
                <div className="clickable-icon nav-action-button" aria-label="排序"></div>
            </div>
        </div>
    );
}
const myTree = (
    <TreeItemNavFile
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
function NavFilesContainer(props: {}) {
    return (
        <div className="nav-files-container node-insert-event show-unsupported" style={{ position: 'relative' }}>
            <div style={{}}>
                <div style={{ width: '294px', height: '0.1px', marginBottom: '0px' }}></div>
            </div>
            <TreeItemNavFile content={''} children={[]}></TreeItemNavFile>
        </div>
    );
}
function TreeItemNavFile(props: FileTreeProps) {
    // 初始化 depth 为 0，如果不是第一次调用，则使用传入的 depth
    const depth = props.depth || 0;
    // 缩进大小，可以根据需要调整
    const indentSize = 2;
    return (
        <div className="tree-item nav-file">
            <div
                className="tree-item-self nav-file-title is-clickable mod-collapsible"
                data-path="zephyr zone/pages/设计文稿"
                draggable="true"
                style={{ marginInlineStart: '-34px !important', paddingInlineStart: '58px !important' }}>
                <div className="tree-item-icon collapse-icon is-collapsed">icon</div>
                <div className="tree-item-inner nav-file-title-content">{props.content}</div>
            </div>
            {props.children.length > 0 &&
                props.children.map((child, index) => {
                    // 传递当前子元素的 content 和 children 属性
                    return <TreeItemChildren key={index} depth={depth + 1} content={child.content} children={child.children} />;
                })}
        </div>
    );
}
function TreeItemChildren(props: FileTreeProps) {
    return (
        <div className="tree-item-children nav-file-children" style={{}}>
            <div style={{ width: '260px', height: ' 0.1px', marginBottom: '0px' }}></div>
            <TreeItemNavFile content={''} children={[]}></TreeItemNavFile>
            {/* <div className="tree-item nav-file is-collapsed">
                <div
                    className="tree-item-self nav-file-title is-clickable mod-collapsible"
                    data-path="zephyr zone/pages/设计文稿"
                    draggable="true"
                    style={{ marginInlineStart: '-34px !important', paddingInlineStart: '58px !important' }}>
                    <div className="tree-item-icon collapse-icon is-collapsed">3</div>
                    <div className="tree-item-inner nav-file-title-content">设计文稿</div>
                </div>
            </div>
            <div className="tree-item nav-file is-collapsed">
                <div
                    className="tree-item-self nav-file-title is-clickable mod-collapsible"
                    data-path="zephyr zone/pages/在构思"
                    draggable="true"
                    style={{ marginInlineStart: '-34px !important', paddingInlineStart: '58px !important' }}>
                    <div className="tree-item-icon collapse-icon is-collapsed">3</div>
                    <div className="tree-item-inner nav-file-title-content">在构思</div>
                </div>
            </div> */}
        </div>
    );
}
