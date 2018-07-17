export const promisify = foo =>
  new Promise((resolve, reject) => {
    foo((error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })

export const extractSales = sales => {
  const ret = {}
  for (const ft in sales) {
    ret[ft] = parseFloat(sales[ft].N)
  }
  return ret
}