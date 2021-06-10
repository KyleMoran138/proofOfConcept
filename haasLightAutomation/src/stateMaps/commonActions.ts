const commonActions: Map<string, Action[]> = new Map([
    [
      "kyle-home",
      [
        {
          newData: {
            home: {
              kyle: true
            }
          }
        }
      ]
    ],
    [
      "kyle-not_home",
      [
        {
          newData: {
            home: {
              kyle: false
            }
          }
        }
      ]
    ],
    [
      "molly-not_home",
      [
        {
          newData: {
            home: {
              molly: false
            }
          }
        }
      ]
    ],
    [
      "molly-home",
      [
        {
          newData: {
            home: {
              molly: true
            }
          }
        }
      ]
    ],
]);