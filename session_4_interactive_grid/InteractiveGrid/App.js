// Custom Rally App that displays Defects in a grid and filter by Iteration and/or Severity.
//
// Note: various console debugging messages intentionally kept in the code for learning purposes

Ext.define('CustomApp', {
    extend: 'Rally.app.App',      // The parent class manages the app 'lifecycle' and calls launch() when ready
    componentCls: 'app',          // CSS styles found in app.css

    // Layout Defs
    items: [
        {// this container lets us control the layout of the pulldowns; they'll be added below
          xtype: 'container',
          itemId: 'pulldown-container',
          layout: {
            type: 'hbox',           // 'horizontal' layout
            align: 'stretch'
          },
        }
    ],
    
    defectStore: undefined,       // app level references to the store and grid for easy access in various methods
    defectGrid: undefined,

    // Entry Point to App
    launch: function() {
      var me = this;
      console.log('our third app');     // see console api: https://developers.google.com/chrome-developer-tools/docs/console-api
      me._loadIterations();
    },
    
    // create iteration pulldown and load iterations
    _loadIterations: function() {
        var me = this;
        console.log('Got me:', me);
        var iterComboBox = Ext.create('Rally.ui.combobox.IterationComboBox', {
          itemId: 'iteration-combobox',
          fieldLabel: 'Iteration',
          labelAlign: 'right',
          width: 300,
          listeners: {
            ready: me._onIterationsReady,       // Paramaters for method are passed at run time, since this method just calls another you could just call that method, this is just example
            select: me._loadData,
            scope: me
          }
        });
        me.down('#pulldown-container').add(iterComboBox);
    },

    _onIterationsReady: function(combobox, eOpts) {
      var me = this;
      console.log('Ready:', combobox);
      me._loadSeverities();                       // We could add more business logic here instead of just calling another method
    },

    // create defect severity pulldown then load data
    _loadSeverities: function() {
        var me = this;
        var severityComboBox = Ext.create('Rally.ui.combobox.FieldValueComboBox', {
          itemId: 'severity-combobox',
          model: 'Defect',
          field: 'Severity',
          fieldLabel: 'Severity',
          labelAlign: 'right',
          listeners: {
            ready: me._loadData,
            select: me._loadData,
            scope: me
          }
        });
        me.down('#pulldown-container').add(severityComboBox);
    },
    
    // construct filters for defects with given iteration (ref) / severity values
    _getFilters: function(iterationValue, severityValue) {
      var iterationFilter = Ext.create('Rally.data.wsapi.Filter', {
              property: 'Iteration',
              operation: '=',
              value: iterationValue
      });
      
      var severityFilter = Ext.create('Rally.data.wsapi.Filter', {
              property: 'Severity',
              operation: '=',
              value: severityValue
      });
      
      return iterationFilter.and(severityFilter);     
    },
    
    // Get data from Rally
    _loadData: function() {
      var me = this;
      var selectedIterRef = me.down('#iteration-combobox').getRecord().get('_ref');          // the _ref is unique, unlike the iteration name that can change; lets query on it instead!
      var selectedSeverityValue = me.down('#severity-combobox').getRecord().get('value');   // remember to console log the record to see the raw data and relize what you can pluck out

      var myFilters = me._getFilters(selectedIterRef, selectedSeverityValue);
      console.log('myFilters:', myFilters.toString());
      
      // if store exists, just load new data
      if (me.defectStore) {
        console.log('store exists');
        me.defectStore.setFilter(myFilters);
        me.defectStore.load();

      // create store
      } else {
        console.log('creating store');
        me.defectStore = Ext.create('Rally.data.wsapi.Store', {     // create defectStore on the App (via this) so the code above can test for it's existence!
          model: 'Defect',
          autoLoad: true,                         // <----- Don't forget to set this to true! heh
          filters: myFilters,
          listeners: {
              load: function(myStore, myData, success) {
                  console.log('got data!', myStore, myData);
                  if (!me.defectGrid) {           // only create a grid if it does NOT already exist
                    me._createGrid(myStore);      // if we did NOT pass scope:this below, this line would be incorrectly trying to call _createGrid() on the store which does not exist.
                  }
              },
              scope: me                        // This tells the wsapi data store to forward pass along the app-level context into ALL listener functions
          },
          fetch: ['FormattedID', 'Name', 'Severity', 'Iteration']   // Look in the WSAPI docs online to see all fields available!
        });
      }
    },

    // Create and Show a Grid of given defect
    _createGrid: function(myDefectStore) {
      var me = this;
      me.defectGrid = Ext.create('Rally.ui.grid.Grid', {
        store: myDefectStore,
        columnCfgs: [         // Columns to display; must be the same names specified in the fetch: above in the wsapi data store
          'FormattedID', 'Name', 'Severity', 'Iteration'
        ]
      });

      me.add(me.defectGrid);       // add the grid Component to the app-level Container (by doing this.add, it uses the app container)

    }
});
