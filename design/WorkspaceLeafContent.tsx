import React from 'react';
import {EntryTree, XMLElement} from './EvolvingTree'
import {App, Menu, TFolder} from "obsidian";
import {useQuery} from "@tanstack/react-query";

interface EntryNode {
  id: number; //条目ID
  name: string; //条目名字
  depth: number; //条目所在位置深度
  app: App;
}

function WorkspaceLeafContent(props: {}) {
  return (
    <div className="workspace-leaf-content" data-type="file-explorer">
      <NavHeader></NavHeader>
      {/*<ETreeForest></ETreeForest>*/}
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

export function ETreeForest(prop: { app: App }) {
  const {data, isSuccess} = useQuery({
    queryKey: ["db"],
    queryFn: async () => {
      const context = new EntryTree()
      await context.prepareDataBase("D:/GitHub/KCMS/.obsidian/plugins/infinite-file-tree/design/sqlite.db", prop.app)
      await context.fromDatabaseBuildTree()
      return context
    }
  })
  if (!isSuccess) return <>ForestElements</>
  console.log(data.toString())
  // 深林结点，构造树结点
  // domTree 递归是一层层访问的。只需要id、name 和 上下文对象。
  const Forest = [...data.root.childNodes].map(node => node as XMLElement)
  const ForestElements = Forest.map(element => {
      // data.getNodeAttributeInDB(Number(element.getAttribute("id"))).then(value => {
      //   console.log(value)
      // })
      return <TreeItemNavFile key={element.getAttribute("id")} context={data} data={{
        id: Number(element.getAttribute("id")),
        name: element.getAttribute("name"),
        depth: Number(element.getAttribute("depth")),
        app: prop.app
      }}/>
    }
  );
  return (
    <div className="nav-files-container node-insert-event show-unsupported" style={{position: 'relative'}}>
      <div style={{}}>
        <div style={{width: '294px', height: '0.1px', marginBottom: '0px'}}></div>
      </div>
      {ForestElements}
    </div>
  );
}

function TreeItemNavFile(props: { context: EntryTree, data: EntryNode }) {
  const depth = props.data.depth || 0;
  // 解析子结点
  const children: EntryNode[] = [];
  [...props.context.findNodeElementById(props.data.id).childNodes]
    .map(node => node as XMLElement)
    .forEach(node => {
      // props.context.getNodeAttributeInDB(Number(node.getAttribute("id"))).then(value => {
      //   console.log(value)
      // })
      children.push({
        id: Number(node.getAttribute("id")),
        name: node.getAttribute("name"),
        depth: props.data.depth,
        app: props.data.app
      });
    })
  const handleRootFolderContextMenu = (event: MouseEvent, folder?: TFolder) => {
    // Event Undefined Correction
    let e = event;
    if (event === undefined) e = window.event as MouseEvent;

    // Menu Items
    const folderMenu = new Menu();

    folderMenu.addItem((menuItem) => {
      menuItem
        .setTitle('New Folder')
        .setIcon('folder')
    });
    folderMenu.addItem((menuItem) => {
      menuItem
        .setTitle('New Folder')
        .setIcon('folder')
    });
    folderMenu.addItem((menuItem) => {
      menuItem
        .setTitle('New Folder')
        .setIcon('folder')
    });

    console.log(`${props.data.id}:: ${props.data.name}`)

    // Trigger
    props.data.app.workspace.trigger('root-folder-menu', folderMenu);
    folderMenu.showAtPosition({x: e.pageX, y: e.pageY});
    return false;
  };
  const indentUnit = 17;
  const InlineStart = depth * indentUnit;
  const marginInlineStart = `${-InlineStart}px !important`;
  const paddingInlineStart = `${InlineStart + 4}px !important`;
  return (
    <div className="tree-item">
      <div
        className="tree-item-self nav-file-title is-clickable mod-collapsible"
        draggable="true"
        style={{paddingLeft: `${InlineStart + 4}px`}}
        onContextMenu={(event) => {
          handleRootFolderContextMenu(event as unknown as MouseEvent)
        }}
      >
        <div className="tree-item-inner nav-file-title-content" style={{display: 'inline-block'}}>
          {props.data.name}
        </div>
      </div>
      {children.length > 0 && <TreeItemChildren context={props.context} children={[...children]}/>}
    </div>
  );
}

function TreeItemChildren(props: { context: EntryTree, children: EntryNode[] }) {
  return (
    <div className="tree-item-children nav-file-children" style={{}}>
      {/*<div style={{width: '260px', height: ' 0.1px', marginBottom: '0px'}}></div>*/}
      {props.children.length > 0 &&
        props.children.map((child) => {
          return <TreeItemNavFile
            key={child.id}
            context={props.context}
            data={{
              id: child.id,
              name: child.name,
              depth: child.depth,
              app: child.app
            }}/>;
        })
      }
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
