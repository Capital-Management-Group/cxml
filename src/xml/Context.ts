// This file is part of cxml, copyright (c) 2016 BusFaster Ltd.
// Released under the MIT license, see LICENSE.

import { Namespace, ModuleExports } from "./Namespace.js"
import { TypeSpec, RawTypeSpec } from "./TypeSpec.js"
import { MemberSpec, RawMemberSpec } from "./MemberSpec.js"
import { Item } from "../xml/Item.js"
import { ContextBase } from "./ContextBase.js"

/** XML parser context, holding definitions of all imported namespaces. */

export class Context extends ContextBase<Namespace> {
  constructor() {
    super(Namespace);
  }

  /** Mark a namespace as seen and add it to list of pending namespaces. */

  markNamespace(exportObj: ModuleExports) {
    this.pendingNamespaceList.push(exportObj);
    ++this.pendingNamespaceCount;
  }

  /** Parse types from schema in serialized JSON format. */

  registerTypes(
    namespace: Namespace,
    exportTypeNameList: string[],
    rawTypeSpecList: RawTypeSpec[],
  ) {
    var exportTypeCount = exportTypeNameList.length;
    var typeCount = rawTypeSpecList.length;
    var typeName: string;

    for (var typeNum = 0; typeNum < typeCount; ++typeNum) {
      var rawSpec = rawTypeSpecList[typeNum];

      if (typeNum > 0 && typeNum <= exportTypeCount) {
        typeName = exportTypeNameList[typeNum - 1];
      } else typeName = null;

      var typeSpec = new TypeSpec(typeName, namespace, rawSpec);

      namespace.addType(typeSpec);
      this.pendingTypeList.push(typeSpec);
      this.typeList.push(typeSpec);
    }
  }

  /** Parse members from schema in serialized JSON format. */

  registerMembers(namespace: Namespace, rawMemberSpecList: RawMemberSpec[]) {
    for (var rawSpec of rawMemberSpecList) {
      var memberSpec = MemberSpec.parseSpec(rawSpec, namespace);

      namespace.addMember(memberSpec);
      this.pendingMemberList.push(memberSpec);
    }
  }

  /** Process namespaces seen so far. */

  process() {
    // Start only when process has been called for all namespaces.

    if (--this.pendingNamespaceCount > 0) return;

    // Link types to their parents.

    for (let exportObject of this.pendingNamespaceList) {
      var namespace = exportObject._cxml[0];
      namespace.link();
    }

    // Create classes for all types.
    // This is effectively Kahn's algorithm for topological sort
    // (the rest is in the TypeSpec class).

    Item.initAll(this.pendingTypeList);
    Item.initAll(this.pendingMemberList);

    for (var typeSpec of this.pendingTypeList) {
      typeSpec.defineMembers();
    }

    this.pendingTypeList = [];
    this.pendingMemberList = [];

    for (let exportObject of this.pendingNamespaceList) {
      var namespace = exportObject._cxml[0];

      namespace.exportTypes(exportObject);
      namespace.exportDocument(exportObject);
    }

    this.pendingNamespaceList = [];
  }

  /** Remove temporary structures needed to define new handlers. */

  cleanPlaceholders(strict?: boolean) {
    for (var namespace of this.namespaceList) {
      namespace.importSpecList = null;
      namespace.exportTypeNameList = null;
      namespace.typeSpecList = null;
      namespace.memberSpecList = null;
      namespace.exportTypeTbl = null;
      namespace.exportMemberTbl = null;
    }

    for (var typeSpec of this.typeList) {
      typeSpec.cleanPlaceholders(strict);
    }

    this.typeList = null;
  }

  /** List of pending namespaces (not yet registered or waiting for processing). */
  private pendingNamespaceList: ModuleExports[] = [];
  /** Grows with pendingNamespaceList and shrinks when namespaces are registered.
   * When zero, all pending namespaces have been registered and can be processed. */
  private pendingNamespaceCount = 0;

  private pendingTypeList: TypeSpec[] = [];
  private pendingMemberList: MemberSpec[] = [];

  private typeList: TypeSpec[] = [];
}
