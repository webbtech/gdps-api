
const prefix = 'GDS_'

export const dynamoTables = {
  CONFIG: `${prefix}Config`,
  DIP: `${prefix}Dip`,
  DIP_OVERSHORT: `${prefix}DipOverShort`,
  FUEL_DELIVER: `${prefix}FuelDeliver`,
  FUEL_PRICE: `${prefix}FuelPrice`,
  FUEL_SALE: `${prefix}FuelSale`,
  FUEL_SALE_WEEKLY: `${prefix}FuelSaleWeekly`,
  IMPORT_LOG: `${prefix}ImportLog`,
  PROPANE_DELIVER: `${prefix}PropaneDeliver`,
  PROPANE_SALE: `${prefix}PropaneSale`,
  STATION: `${prefix}Station`,
  STATION_NODE: `${prefix}StationNode`,
  STATION_TANK: `${prefix}StationTank`,
  TANK: `${prefix}Tank`,
}

export const propaneTankIDs = [475, 476]

export const FUEL_TYPE_LIST = ['NL', 'SNL', 'DSL', 'CDSL']

export const COGNITO_USER_POOL_ID = 'https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_lolwfYIAr'

// lambda used when downloading fuel sales data from Sales app in "Import Sales Data"
export const FUELSALE_EXPORT_LAMBDA = 'https://fs-export.gsales.pfapi.io/export'

// ========== Various Report Lambdas ============================================================
// report: Station Report
export const FUELSALE_REPORT_LAMBDA = 'https://fs-dwnld.gdps.pfapi.io/fuelsale'

// report: Fuel Sale Summary Report
export const FUELSALE_SUM_REPORT_LAMBDA = 'https://fs-sum-dwnld.gdps.pfapi.io/report'
// export const FUELSALE_SUM_REPORT_LAMBDA = 'https://hwk86da6hc.execute-api.ca-central-1.amazonaws.com/Prod/report'

// report: Propane Report
export const PROPANE_REPORT_LAMBDA = 'https://gxt4m8srs4.execute-api.ca-central-1.amazonaws.com/Prod/propane'
