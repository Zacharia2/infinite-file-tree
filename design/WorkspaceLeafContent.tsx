import React from 'react';

interface FileNode {
  title?: string; // 结点名称eid
  type?: string; // 结点类型，
  text: string; // 文本型结点，或者文件路径
  field?: Record<string, string>; // 结点字段
  depth?: number;
  children: FileNode[]; // 子节点。
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

function TreeItemNavFile(props: FileNode) {
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

function TreeItemChildren(props: FileNode) {
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
