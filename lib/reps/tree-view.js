/* See license.txt for terms of usage */

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/repository");
const { isCropped } = require("reps/string");
const { TR, TD, SPAN, TABLE, TBODY } = Reps.DOM;

/**
 * @template This component represents a tree view with
 * expandable/collapsible nodes.
 */
var TreeView = React.createFactory(React.createClass(
/** @lends TreeView */
{
  displayName: "TreeView",

  getInitialState: function() {
    return {
      data: {},
      uid: 0,
      searchFilter: null
    };
  },

  // Rendering

  render: function() {
    var rows = [];
    var mode = this.props.mode;
    var state = this.state;

    var rowRep = this.props.rowRep || TreeRow;

    var renderMembers = (members) => {
      for (var i in members) {
        var member = members[i];
        rows.push(TreeRow({
          tree: this,
          key: member.key,
          data: member,
          mode: mode,
          listener: this.props.listener,
          provider: this.props.provider,
          decorator: this.props.decorator,
          searchFilter: state.searchFilter || this.props.searchFilter
        }));

        if (member.children && member.children.length && member.open) {
          renderMembers(member.children);
        }
      };
    }

    renderMembers(this.state.members, 0);

    return (
      TABLE({className: "domTable", cellPadding: 0, cellSpacing: 0,
        onClick: this.onClick},
        TBODY({}, rows)
      )
    );
  },

  // Event Handlers

  onClick: function(event) {
    this.setState({members: this.state.members});
  },

  // Data

  componentDidMount: function() {
    if (this.state.members) {
      return;
    }

    var members = this.initMembers(this.props.data, 0);

    this.setState({
      members: members,
      searchFilter: this.props.searchFilter
    });
  },

  componentWillReceiveProps: function(nextProps) {
    var updatedState = {
      searchFilter: nextProps.searchFilter
    };

    var update = nextProps.forceUpdate || (this.props.data !== nextProps.data);

    if (update) {
      updatedState.members = this.initMembers(nextProps.data, 0);
    }

    this.setState(updatedState);
  },

  initMembers: function(parent, level) {
    var members = this.getMembers(parent, level);
    if (!members) {
      return;
    }

    for (var i in members) {
      var member = members[i];

      // Children for some nodes can be fetched when the node
      // is actually expanded (in the UI) for the first time.
      if (member.lazyLoad && !member.open) {
        continue;
      }

      // Cropped strings are expandable, but they don't have children.
      var isString = typeof(member.value) == "string";
      if (member.hasChildren && !isString) {
        member.children = this.initMembers(member.value, level+1);
      }
    };

    return members;
  },

  getMembers: function(object, level) {
    level = level || 0;

    if (this.props.provider) {
      return this.fetchMembers(object, level);
    }

    var getObjectProperties = this.props.getObjectProperties ||
      this.getObjectProperties;
    var hasProperties = this.props.hasProperties ||
      this.hasProperties;

    // Iterate over all properties and create 'members' - data
    // structures representing the tree state.
    var members = [];
    getObjectProperties(object, (prop, value) => {
      var hasChildren = hasProperties(value);

      // Cropped strings are expandable, so the user can see the
      // entire original value.
      if (isCropped(value)) {
        hasChildren = true;
      }

      var type = this.getType(value);
      var member = this.createMember(type, prop, value, level, hasChildren);
      members.push(member);
    });

    return members;
  },

  fetchMembers: function(object, level) {
    var provider = this.props.provider;
    var children = provider.getChildren(object);
    if (!children) {
      return;
    }

    if (children instanceof Promise) {
      return;
    }

    var members = [];
    for (var i=0; i<children.length; i++) {
      var child = children[i];
      var hasChildren = provider.hasChildren(child);
      var name = provider.getLabel(child);
      var value = provider.getValue(child);
      var type = this.getType(child);

      // Cropped strings are expandable, so the user can see the
      // entire original value.
      if (isCropped(value)) {
        hasChildren = true;
      }

      var member = this.createMember(type, name, child, level, hasChildren);
      member.lazyLoad = true;
      member.provider = provider;
      member.decorator = this.props.decorator;
      members.push(member);
    }

    return members;
  },

  createMember: function(type, name, value, level, hasChildren) {
    var member = {
      name: name,
      type: type,
      rowClass: "memberRow-" + type,
      open: "",
      level: level,
      hasChildren: hasChildren,
      value: value,
      open: false,
      lazyLoad: true,
      key: this.state.uid++
    };

    return member;
  },

  getObjectProperties: function(obj, callback) {
    for (var p in obj) {
      try {
        callback.call(this, p, obj[p]);
      }
      catch (e) {
        console.log("domTree.getObjectProperties; EXCEPTION " + e, e);
      }
    }
  },

  hasProperties: function(obj) {
    var type = typeof(obj);
    if (type === "string") {
      return false;
    }

    if (type !== "object") {
      return false;
    }

    try {
      for (var name in obj) {
        return true;
      }
    }
    catch (exc) {
    }

    return false;
  },

  getType: function(object) {
    return "dom";
  },
}));

/**
 * @template Represents a node in TreeView template.
 */
var TreeRow = React.createFactory(React.createClass({
  displayName: "TreeRow",

  getInitialState: function() {
    return { data: {}, searchFilter: null };
  },

  componentDidMount: function() {
    this.setState({data: this.props.data});
  },

  getRowClassNames: function(object) {
    var decorator = this.props.decorator;
    if (decorator && typeof decorator.getRowClassNames == "function") {
      return decorator.getRowClassNames(object);
    }
  },

  render: function() {
    var member = this.state.data;
    var classNames = this.getRowClassNames(member.value) || [];
    classNames.push("memberRow");
    classNames.push(member.type + "Row");

    if (member.hasChildren) {
      classNames.push("hasChildren");
    }

    if (member.open) {
      classNames.push("opened");
    }

    if (member.loading) {
      classNames.push("spinning");
    }

    var filter = this.props.searchFilter;
    var name = member.name || "";
    var value = member.value || "";

    var provider = this.props.provider;
    if (provider) {
      value = provider.getValue(member.value);
    }

    if (filter && (name.indexOf(filter) < 0)) {
      // Cache the stringify result, so the filtering is fast
      // the next time.
      if (!member.valueString) {
        member.valueString = JSON.stringify(value);
      }

      if (member.valueString && member.valueString.indexOf(filter) < 0) {
        classNames.push("hidden");
      }
    }

    var level = member.level || 0;
    var rowStyle = {
      "paddingLeft": (level * 16) + "px",
    };

    var TAG;

    var decorator = this.props.decorator;
    if (decorator && typeof getValueRep == "function") {
      TAG = decorator.getValueRep(value);
    }

    if (!TAG) {
      TAG = Reps.getRep(value);
    }

    return (
      TR({className: classNames.join(" "), onClick: this.onClick},
        TD({className: "memberLabelCell", style: rowStyle},
          SPAN({className: "memberLabel " + member.type + "Label"},
            name)
        ),
        TD({className: "memberValueCell"},
          SPAN({},
            TAG({
              object: value,
              mode: this.props.mode,
              member: member,
              provider: provider,
              decorator: decorator
            })
          )
        )
      )
    )
  },

  onClick: function(event) {
    if (event.target.classList.contains("memberLabel")) {
      var member = this.state.data;
      var tree = this.props.tree;

      // Flip open flag.
      member.open = !member.open;

      // xxxHonza: refactor (do not use promises?)
      if (this.props.provider) {
        var value = this.props.provider.getValue(member.value);
        if (typeof(value) == "string") {
          // Cropped strings don't have children
          this.setState({data: member});
        } else if (member.hasChildren && !member.children) {
          var properties = this.props.provider.getChildren(member.value);
          if (properties instanceof Promise) {
            member.loading = true;
            properties.then(props => {
              member.loading = false;

              member.children = tree.initMembers(member.value, member.level+1);
              this.setState({data: member});
            });
          } else {
            member.children = tree.initMembers(member.value, member.level+1);
            this.setState({data: member});
          }
        } else {
          this.setState({data: member});
        }
      }
      else {
        if (!member.children) {
          member.children = tree.initMembers(member.value, member.level+1);
        }
        this.setState({data: member});
      }
    }

    dispatch(this.props.listener, "onRowClick", [this]);
  },
}));

// Helpers

function dispatch(listener, eventId, args) {
  if (listener && typeof listener[eventId] == "function") {
    listener[eventId].apply(listener, args);
  }
}

// Exports from this module
exports.TreeView = TreeView;
exports.TreeRow = TreeRow;
});
