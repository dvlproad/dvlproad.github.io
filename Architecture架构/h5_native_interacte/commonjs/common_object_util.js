/*
 * @Author: dvlproad
 * @Date: 2023-03-03 13:58:12
 * @LastEditors: dvlproad
 * @LastEditTime: 2023-03-03 13:58:24
 * @Description: 
 */
// [js 删除Object中指定的key](https://blog.csdn.net/weixin_39501680/article/details/123110404)
const isObject = (obj) => obj === Object(obj)
const isNil = (val) => val === undefined || val === null
const isEmpty = (val) => {
  return isString(val) || isObject(val) || Array.isArray(val) ?
    !Object.keys(val).length : isNil(val)
}
const isString = (val) => typeof val === 'string'
const deleteObjectByKey = (obj = {}, arr = []) => {
  if (isEmpty(obj) || !isObject(obj)) return {}
  if (isEmpty(arr) || (!Array.isArray(arr) && !isString(arr))) return obj



  return Object.keys(obj)
    .filter((k) => !arr.includes(k))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {})
}