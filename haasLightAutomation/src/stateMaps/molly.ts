const mollyHomeMap = new Map([
  [
    "dimmer01-on", [
      {
        entity_id: 'light.office_lights',
        setting: {state: 'on'},
        timers: [
          {
            secondsDelay: 10,
            actions: [
              {
                entity_id: 'light.office_lights',
                setting: {
                  state: 'off',
                }
              }
            ]
          }
        ]
      }
    ]
  ],
  ["dimmer01-off", [{entity_id: 'light.office_lights', setting: {state: 'off'}}]],
  [ 
    "motion02-started", [
      {...generateOnOffAction('light.kitchen_lights', 'on'), timers: [{secondsDelay: 15, actions: [{...generateOnOffAction('light.kitchen_lights', 'off')}]}]}
    ]
  ]
])