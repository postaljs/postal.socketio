var props = ["firstName", "lastName", "city", "state"];

var wireTap = new postal.diagnostics.DiagnosticsWireTap();

$(function(){
	io.connect(window.location.origin);

	var vm = window.VM = {
		firstName    : ko.observable(),
		lastName     : ko.observable(),
		city         : ko.observable(),
		state        : ko.observable(),
		isEditing    : ko.observable(false),
		toggleEdit   : function() {
					   	   this.isEditing(!this.isEditing());
					   }
	};

	vm.location = ko.computed(function() {
		return (this.city() || "Unknown City") + ", " + (this.state() || "Unknown State");
	}, vm);
	vm.fullName = ko.computed(function() {
		return (this.firstName() || "Unknown First Name") + ", " + (this.lastName() || "Unknown Last Name");
	}, vm);
	vm.isNotEditing = ko.computed(function() {
		return !this.isEditing();
	}, vm);

	postal.instanceId(postal.utils.createUUID());

	postal.fedx.addFilter([
		{ channel: 'ko', topic: '#', direction: 'both' }
	]);

	var koCh = postal.channel("ko");

	koCh.subscribe("contact.edit.*", function(d, e) {
		var segments = e.topic.split(".");
		var prop = segments[2];
		if(vm.hasOwnProperty(prop)) {
			vm[prop](d);
		}
	}).withConstraint(function(){
		return !vm.isEditing();
	});

	_.each(props, function(prop) {
		vm[prop].subscribe(function(val){
			if(vm.isEditing()) {
				koCh.publish("contact.edit." + prop, val);
			}
		});
	});

	ko.applyBindings(vm);

	postal.fedx.signalReady();
});