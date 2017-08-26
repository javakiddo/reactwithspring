'use strict';

const React = require('react');
const ReactDOM = require('react-dom')
const client = require('./client');
const follow = require('./follow');

// function to hop multiple links by "rel"

const root = '/api';

class App extends React.Component {
  constructor(props)
  {
    super(props);
    this.state = {
      employees: [],
      attributes: [],
      pageSize: 2,
      links: {}
    };
    this.onNavigate = this.onNavigate.bind(this);
    this.onCreate=this.onCreate.bind(this);
    this.updatePageSize = this.updatePageSize.bind(this);
		this.onDelete = this.onDelete.bind(this);
		this.onNavigate = this.onNavigate.bind(this);
  }

  componentDidMount() {
    this.loadFromServer(this.state.pageSize);


  }

  loadFromServer(pageSize) {
    console.log("pageSize", pageSize);
    follow(client, root, [
      {
        rel: 'employees',
        params: {
          'size': pageSize
        }
      }
    ]).then(employeeCollection => {
      return client({
        method: 'GET',
        path: employeeCollection.entity._links.profile.href,
        headers: {
          'Accept': 'application/schema+json'
        }
      }).then(schema => {
        this.schema = schema.entity;
        console.log(schema);
        return employeeCollection;
      });
    }).done(employeeCollection => {
      this.setState({
        employees: employeeCollection.entity._embedded.employees,
        attributes: Object.keys(this.schema.properties),
        pageSize: pageSize,
        links: employeeCollection.entity._links
      });
    });

  }
  onCreate(newEmployee)
  {
    console.log("New Employee ", newEmployee);
  follow(client,root,['employees']).then(employeeCollection => {
    return new client(
      {
        method:'POST',
        path:employeeCollection.entity._links.self.href,
        entity:newEmployee
        , headers: {'Content-Type': 'application/json'}
      })
    }).then(response => {
      console.log("Response from Post ", response);
      return follow(client,root,[{rel:'employees',params:{'size':this.state.pageSize}}]);
    }).done(response => {
      if (typeof response.entity._links.last != "undefined") {
      this.onNavigate(response.entity._links.last.href);
    } else {
      this.onNavigate(response.entity._links.self.href);
    }

    }
    );

  }

  onDelete(employee)
  {
    client({method: "DELETE", path:employee._links.self.href}).done(response=>{
      this.loadFromServer(this.state.pageSize);
    });

  }

  onNavigate(navLink){
    client({method:'GET',path:navLink}).done(employeeCollection=>{
      this.setState({
      employees: employeeCollection.entity._embedded.employees,
      attributes: this.state.attributes,
      pageSize: this.state.pageSize,
      links: employeeCollection.entity._links
    })
  });

    }

  updatePageSize(pageSize) {
	if (pageSize !== this.state.pageSize) {
		this.loadFromServer(pageSize);
	}
}
  render() {

    return (
      <div>
      <CreateDialog attributes={this.state.attributes} onCreate={this.onCreate}/>
      <EmployeeList
        employees={this.state.employees}
        onNavigate={this.onNavigate}
        links={this.state.links}
        pageSize={this.state.pageSize}
        onDelete={this.onDelete}
				updatePageSize={this.updatePageSize}
      />
      </div>
    )

  }

}


class CreateDialog extends React.Component {

  constructor(props)
  {
    super(props);
    this.handleSubmit=this.handleSubmit.bind(this);
  }

  handleSubmit(e)
  {
    e.preventDefault();
    var newEmployee={};
    this.props.attributes.forEach(attribute=>{
      newEmployee[attribute]=ReactDOM.findDOMNode(this.refs[attribute]).value.trim();
    });
      this.props.onCreate(newEmployee);

    this.props.attributes.forEach(attribute=>{
      ReactDOM.findDOMNode(this.refs[attribute]).value='';
    });
    window.location="#";



  }

  render() {
    var inputs = this.props.attributes.map(attribute =>
      <p key={attribute}>

      <input type="text" placeholder={attribute} ref={attribute} className="field"/>
    </p>);

    return(
    <div >
       <a href="#createEmployee">Create</a>
        <div id = "createEmployee" className = "modalDialog" >
          <div>
            <a href="#" className="close">X</a>
            <h2> Create New employee </h2>
      <form>
        {inputs}
        <button onClick={this.handleSubmit}>Create </button >
      </form>
    </div>
   </div>
  </div>
)
  }
}
class EmployeeList extends React.Component {

  constructor(props) {
		super(props);
		this.handleNavFirst = this.handleNavFirst.bind(this);
		this.handleNavPrev = this.handleNavPrev.bind(this);
		this.handleNavNext = this.handleNavNext.bind(this);
		this.handleNavLast = this.handleNavLast.bind(this);
		this.handleInput = this.handleInput.bind(this);
	}
  handleNavFirst(e){
	e.preventDefault();
	this.props.onNavigate(this.props.links.first.href);
}

handleNavPrev(e) {
	e.preventDefault();
	this.props.onNavigate(this.props.links.prev.href);
}

handleNavNext(e) {
	e.preventDefault();
	this.props.onNavigate(this.props.links.next.href);
}

handleNavLast(e) {
	e.preventDefault();
	this.props.onNavigate(this.props.links.last.href);
}

handleInput(e) {
	e.preventDefault();
	var pageSize = ReactDOM.findDOMNode(this.refs.pageSize).value;
	if (/^[0-9]+$/.test(pageSize)) {
		this.props.updatePageSize(pageSize);
	} else {
		ReactDOM.findDOMNode(this.refs.pageSize).value =
			pageSize.substring(0, pageSize.length - 1);
	}
}

  render() {
    var employees = this.props.employees.map(employee =>
      <Employee
        key={employee._links.self.href}
        employee={employee}
        onDelete={this.props.onDelete}
        />
      );
      var navLinks = [];
      console.log(this.props.links);
	if ("first" in this.props.links) {
		navLinks.push(<button key="first" onClick={this.handleNavFirst}>&lt;&lt;</button>);
	}
	if ("prev" in this.props.links) {
		navLinks.push(<button key="prev" onClick={this.handleNavPrev}>&lt;</button>);
	}
	if ("next" in this.props.links) {
		navLinks.push(<button key="next" onClick={this.handleNavNext}>&gt;</button>);
	}
	if ("last" in this.props.links) {
		navLinks.push(<button key="last" onClick={this.handleNavLast}>&gt;&gt;</button>);
	}

  console.log("Navlinks",navLinks);
    return (

      <div>
        <input ref="pageSize" defaultValue={this.props.pageSize} onInput={this.handleInput}/>
      <table>
        <tbody>
          <tr>
            <th>First Name</th>
            <th>Last Name</th>
            <th>Description</th>
          </tr>
          {employees}
        </tbody>
      </table>
        <div>
          {navLinks}
        </div>
      </div>
    )

  }
}

class Employee extends React.Component {

  constructor(props) {
    super(props);
    this.handleDelete=this.handleDelete.bind(this);
    console.log("props called " + this.props);
  }

handleDelete()
{
  this.props.onDelete(this.props.employee);
}

  render() {

    return (

      <tr>
        <td>{this.props.employee.firstName}</td>
        <td>{this.props.employee.lastName}</td>
        <td>{this.props.employee.description}</td>
        <td>
          <button onClick={this.handleDelete}>Delete</button>

        </td>
      </tr>
    )

  }
}

ReactDOM.render(
  <App/>, document.getElementById('react'))
