import React, {useEffect, useState} from 'react';
import {EntryTree, XMLElement} from './EvolvingTree'
import ReactDOM from "react-dom/client";


interface EntryNode {
  id?: number; //条目ID
  name?: string; //条目名字
  depth?: number; //条目所在位置深度
}


ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MyForest/>
  </React.StrictMode>,
);

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

export function MyForest() {
  const [contextState, setContextState] = useState(null)
  useEffect(() => {
    (async function anyNameFunction() {
      const entryTree = new EntryTree()
      await entryTree.fromDatabaseBuildTree("./sqlite.db")
      setContextState(entryTree)
    })();
  })
  // domTree 递归是一层层访问的。
  // 只需要id、name 和 上下文对象。
  // 递归只需要传递上下文和下一层结点的属性

  // 深林结点，构造树结点
  let Forest = [...contextState.getForest().childNodes].map(node => node as XMLElement).map(element =>
    <TreeItemNavFile
      context={contextState}
      data={{
        id: Number(element.getAttribute("id")),
        name: element.getAttribute("name"),
        depth: Number(element.getAttribute("depth")),
      }}/>
  )
  return (<>{Forest}</>)
}

function NavFilesContainer(props: {}) {
  return (
    <div className="nav-files-container node-insert-event show-unsupported" style={{position: 'relative'}}>
      <div style={{}}>
        <div style={{width: '294px', height: '0.1px', marginBottom: '0px'}}></div>
      </div>
      <TreeItemNavFile context={null} data={undefined}/>
    </div>
  );
}

function TreeItemNavFile(props: { context: EntryTree, data: EntryNode }) {
  // 树结点
  // 此节点的信息已经从父节点解析，只需要访问即可获得
  // children需要从父节点解析后传递给子节点
  const depth = props.data.depth || 0;

  // 解析子结点
  const children: EntryNode[] = [];
  const entry: EntryNode | null = null;
  [...props.context.findNodeElementById(props.data.id).childNodes]
    .map(node => node as XMLElement)
    .forEach(node => {
      entry.id = Number(node.getAttribute("id"))
      entry.name = node.getAttribute("name");
      entry.depth = props.data.depth
      children.push(entry);
    })
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
          {props.data.name}
        </div>
      </div>
      {children.length > 0 &&
        children.map((child) => {
          // 传递当前子元素的 content 和 children 属性
          return <TreeItemChildren
            key={child.id}
            context={props.context}
            data={{
              id: child.id,
              name: child.name,
              depth: child.depth,
            }}/>;
        })}
    </div>
  );
}

function TreeItemChildren(props: { context: EntryTree, data: EntryNode }) {
  // 树的一个子结点。
  return (
    <div className="tree-item-children nav-file-children" style={{}}>
      <div style={{width: '260px', height: ' 0.1px', marginBottom: '0px'}}></div>
      <TreeItemNavFile
        context={props.context}
        data={{
          id: props.data.id,
          name: props.data.name,
          depth: props.data.depth
        }}/>
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
