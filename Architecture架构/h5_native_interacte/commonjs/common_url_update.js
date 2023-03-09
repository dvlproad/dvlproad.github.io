/*
 * @Author: dvlproad
 * @Date: 2023-03-03 14:02:09
 * @LastEditors: dvlproad
 * @LastEditTime: 2023-03-09 14:01:48
 * @Description: 对url进行参数新增等操作的方法
 */
/// 为 oldUrl 添加 newParams 参数，返回新url
function addParamsForUrl(oldUrl, newParams) {
    if (newParams == null || newParams == {} || typeof newParams == "undefined") {
      return oldUrl;
    }

    var keys = Object.keys(newParams); // 获取map的所有keys
    console.log(`keys=${keys}`);
    var count = keys.length;
    // var count = oldUrl.size;
    var newParamsString = '';
    for (var i = 0; i < count; i++) {
      var key = keys[i];
      var value = newParams[key];
      if (typeof val === 'string') {
        stringValue = value;
      } else {
        stringValue = JSON.stringify(value);
      }

      if (i > 0) {
        newParamsString += '&';
      }
      newParamsString += `${key}=${stringValue}`;
    }
    

    var paramStartIndex = oldUrl.indexOf("?");
    var connectorFlag;
    if (paramStartIndex != -1) {
      connectorFlag = '&';
    } else {
      connectorFlag = '?';
    }
    return `${oldUrl}${connectorFlag}${newParamsString}`;
  }