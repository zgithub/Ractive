// Section
DomSection = function ( options, docFrag ) {
	this.type = SECTION;

	this.fragments = [];
	this.length = 0; // number of times this section is rendered

	if ( docFrag ) {
		this.docFrag = doc.createDocumentFragment();
	}
	
	this.initialising = true;
	initMustache( this, options );

	if ( docFrag ) {
		docFrag.appendChild( this.docFrag );
	}

	this.initialising = false;
};

DomSection.prototype = {
	update: updateMustache,
	resolve: resolveMustache,

	smartUpdate: function ( methodName, args ) {
		var fragmentOptions, i;

		if ( methodName === 'push' || methodName === 'unshift' || methodName === 'splice' ) {
			fragmentOptions = {
				descriptor: this.descriptor.f,
				root:       this.root,
				parentNode: this.parentNode,
				owner:      this
			};

			if ( this.descriptor.i ) {
				fragmentOptions.indexRef = this.descriptor.i;
			}
		}

		if ( this[ methodName ] ) { // if not, it's sort or reverse, which doesn't affect us (i.e. our length)
			this[ methodName ]( fragmentOptions, args );
		}
	},

	pop: function () {
		// teardown last fragment
		if ( this.length ) {
			this.fragments.pop().teardown( true );
			this.length -= 1;
		}
	},

	push: function ( fragmentOptions, args ) {
		var start, end, i;

		// append list item to context stack
		start = this.length;
		end = start + args.length;

		for ( i=start; i<end; i+=1 ) {
			fragmentOptions.contextStack = this.contextStack.concat( this.keypath + '.' + i );
			fragmentOptions.index = i;

			this.fragments[i] = this.createFragment( fragmentOptions );
		}
		
		this.length += args.length;

		// append docfrag in front of next node
		this.parentNode.insertBefore( this.docFrag, this.parentFragment.findNextNode( this ) );
	},

	shift: function () {
		this.splice( null, [ 0, 1 ] );
	},

	unshift: function ( fragmentOptions, args ) {
		this.splice( fragmentOptions, [ 0, 0 ].concat( new Array( args.length ) ) );
	},

	splice: function ( fragmentOptions, args ) {
		var insertionPoint, addedItems, removedItems, balance, i, start, end, spliceArgs, reassignStart, reassignEnd, reassignBy;

		if ( !args.length ) {
			return;
		}

		// figure out where the changes started...
		start = +( args[0] < 0 ? this.length + args[0] : args[0] );

		// ...and how many items were added to or removed from the array
		addedItems = Math.max( 0, args.length - 2 );
		removedItems = ( args[1] !== undefined ? args[1] : this.length - start );

		balance = addedItems - removedItems;

		if ( !balance ) {
			// The array length hasn't changed - we don't need to add or remove anything
			return;
		}

		// If more items were removed than added, we need to remove some things from the DOM
		if ( balance < 0 ) {
			end = start - balance;

			for ( i=start; i<end; i+=1 ) {
				this.fragments[i].teardown( true );
			}

			// Keep in sync
			this.fragments.splice( start, -balance );
		}

		// Otherwise we need to add some things to the DOM
		else {
			end = start + balance;

			// Figure out where these new nodes need to be inserted
			insertionPoint = ( this.fragments[ start ] ? this.fragments[ start ].firstNode() : this.parentFragment.findNextNode( this ) );

			// Make room for the new fragments. (Just trust me, this works...)
			spliceArgs = [ start, 0 ].concat( new Array( balance ) );
			this.fragments.splice.apply( this.fragments, spliceArgs );

			for ( i=start; i<end; i+=1 ) {
				fragmentOptions.contextStack = this.contextStack.concat( this.keypath + '.' + i );
				fragmentOptions.index = i;

				this.fragments[i] = this.createFragment( fragmentOptions );
			}

			// Append docfrag in front of insertion point
			this.parentNode.insertBefore( this.docFrag, insertionPoint );
		}

		this.length += balance;


		// Now we need to reassign existing fragments (e.g. items.4 -> items.3 - the keypaths,
		// context stacks and index refs will have changed)
		reassignStart = ( start + addedItems );

		reassignFragments( this.root, this, reassignStart, this.length, balance );
	},

	teardown: function ( detach ) {
		this.teardownFragments( detach );

		teardown( this );
	},

	firstNode: function () {
		if ( this.fragments[0] ) {
			return this.fragments[0].firstNode();
		}

		return this.parentFragment.findNextNode( this );
	},

	findNextNode: function ( fragment ) {
		if ( this.fragments[ fragment.index + 1 ] ) {
			return this.fragments[ fragment.index + 1 ].firstNode();
		}

		return this.parentFragment.findNextNode( this );
	},

	teardownFragments: function ( detach ) {
		while ( this.fragments.length ) {
			this.fragments.shift().teardown( detach );
		}
	},

	render: function ( value ) {
		
		updateSection( this, value );

		if ( !this.initialising ) {
			// we need to insert the contents of our document fragment into the correct place
			this.parentNode.insertBefore( this.docFrag, this.parentFragment.findNextNode( this ) );
		}
	},

	createFragment: function ( options ) {
		var fragment = new DomFragment( options );
		
		if ( this.docFrag ) {
			this.docFrag.appendChild( fragment.docFrag );
		}

		return fragment;
	},

	toString: function () {
		var str, i, len;

		str = '';

		i = 0;
		len = this.length;

		for ( i=0; i<len; i+=1 ) {
			str += this.fragments[i].toString();
		}

		return str;
	}
};