import React from 'react';

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

// // 将邻接表中的每个节点转换为具有children属性的对象
// 遍历这个转换后的对象，如果当前节点是另一个节点的子节点，则将其添加到该节点的children数组中


interface FileTreeProps {
  // 结点名称eid
  name?: string;
  // 结点其它字段
  field?: Record<string, string>;
  // 结点类型，
  type?: string;
  // 文本型结点
  text?: string;
  depth?: number;
  // 子节点。
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

export const myTree = (
  <TreeItemNavFile
    text="Root"
    children={[
      {
        text: '1 Child 1',
        children: [
          {
            text: '2 Grandchild 1',
            children: [
              {
                text: '3 Child 3',
                children: [
                  {
                    text: '4 Grandchild 3',
                    children: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        text: '1 Child 2',
        children: [],
      },
    ]}
  />
);

function NavFilesContainer(props: {}) {
  return (
    <div className="nav-files-container node-insert-event show-unsupported" style={{position: 'relative'}}>
      <div style={{}}>
        <div style={{width: '294px', height: '0.1px', marginBottom: '0px'}}></div>
      </div>
      <TreeItemNavFile text={''} children={[]}></TreeItemNavFile>
    </div>
  );
}

function TreeItemNavFile(props: FileTreeProps) {
  // 初始化 depth 为 0，如果不是第一次调用，则使用传入的 depth
  const depth = props.depth || 0;
  // const indentUnit = 17;
  // const InlineStart = depth * indentUnit;
  // marginInlineStart: `${-InlineStart}px`,
  // paddingInlineStart: `${InlineStart + 4}px`,
  return (
    <div className="tree-item nav-file">
      <div
        className="tree-item-self nav-file-title is-clickable mod-collapsible"
        data-path="zephyr zone/pages/设计文稿"
        draggable="true"
        style={{
          textIndent: `${depth}em`,
        }}>
        <div
          className="tree-item-icon collapse-icon is-collapsed"
          style={{
            display: 'inline-block',
            width: '0.9rem',
            height: '0.9rem',
          }}>
          <FileIcon></FileIcon>
        </div>
        <div
          className="tree-item-inner nav-file-title-content"
          style={{
            display: 'inline-block',
          }}>
          {props.text}
        </div>
      </div>
      {props.children.length > 0 &&
        props.children.map((child, index) => {
          // 传递当前子元素的 content 和 children 属性
          return <TreeItemChildren key={index} depth={depth + 1} text={child.text} children={child.children}/>;
        })}
    </div>
  );
}

function TreeItemChildren(props: FileTreeProps) {
  return (
    <div className="tree-item-children nav-file-children" style={{}}>
      <div style={{width: '260px', height: ' 0.1px', marginBottom: '0px'}}></div>
      <TreeItemNavFile text={props.text} children={props.children} depth={props.depth}></TreeItemNavFile>
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

function FileIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="">
      <path d="M0 0h24v24H0V0z" fill="none"/>
      <path
        d="M8 16h8v2H8zm0-4h8v2H8zm6-10H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
    </svg>
  );
}
