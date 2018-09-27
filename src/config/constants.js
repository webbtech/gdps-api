
const prefix = 'GDS_'

export const dynamoTables = {
  CONFIG:           `${prefix}Config`,
  DIP:              `${prefix}Dip`,
  DIP_OVERSHORT:    `${prefix}DipOverShort`,
  FUEL_DELIVER:     `${prefix}FuelDeliver`,
  FUEL_PRICE:       `${prefix}FuelPrice`,
  FUEL_SALE:        `${prefix}FuelSale`,
  FUEL_SALE_WEEKLY: `${prefix}FuelSaleWeekly`,
  IMPORT_LOG:       `${prefix}ImportLog`,
  PROPANE_DELIVER:  `${prefix}PropaneDeliver`,
  PROPANE_SALE:     `${prefix}PropaneSale`,
  STATION:          `${prefix}Station`,
  STATION_NODE:     `${prefix}StationNode`,
  STATION_TANK:     `${prefix}StationTank`,
  TANK:             `${prefix}Tank`,
}

export const propaneTankIDs = [475, 476]

export const FUEL_TYPE_LIST = ['NL', 'SNL', 'DSL', 'CDSL']

export const COGNITO_USER_POOL_ID = 'https://cognito-idp.us-east-1.amazonaws.com/us-east-1_gsB59wfzW'

export const FUELSALE_REPORT_LAMBDA = 'https://a832vgfu22.execute-api.ca-central-1.amazonaws.com/Prod/fuelsale'
export const FUELSALE_EXPORT_LAMBDA = 'https://z5wcxm5bv3.execute-api.ca-central-1.amazonaws.com/Prod/export'

export const PROPANE_REPORT_LAMBDA = 'https://gxt4m8srs4.execute-api.ca-central-1.amazonaws.com/Prod/propane'