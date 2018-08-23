
const prefix = 'GDS_'

export const dynamoTables = {
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