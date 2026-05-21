/*
 * @Author: dvlproad dvlproad@163.com
 * @Date: 2023-02-11 14:56:20
 * @LastEditors: dvlproad dvlproad@163.com
 * @LastEditTime: 2023-02-12 15:07:54
 * @FilePath: /undefined/Users/lichaoqian/Project/CQBook/dvlproadHexo/source/_posts/Architecture架构/h5js/dvlp_h5js_demo/dvlp_h5_open_app_url_create_demo.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */


const isObject = (obj) => obj === Object(obj)
const isNil = (val) => val === undefined || val === null
const isEmpty = (val) => {
  return isString(val) || isObject(val) || Array.isArray(val) ?
    !Object.keys(val).length : isNil(val)
}
const isString = (val) => typeof val === 'string'

// [js 删除Object中指定的key](https://blog.csdn.net/weixin_39501680/article/details/123110404)
const deleteObjectByKey = (obj = {}, arr = []) => {
  if (isEmpty(obj) || !isObject(obj)) return {}
  if (isEmpty(arr) || (!Array.isArray(arr) && !isString(arr))) return obj

  return Object.keys(obj)
    .filter((k) => !arr.includes(k))
    .reduce((acc, key) => ((acc[key] = obj[key]), acc), {})
}

