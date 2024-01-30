/*
 * @Author: dvlproad dvlproad@163.com
 * @Date: 2023-02-11 14:56:20
 * @LastEditors: dvlproad dvlproad@163.com
 * @LastEditTime: 2023-02-12 15:18:22
 * @FilePath: /undefined/Users/lichaoqian/Project/CQBook/dvlproadHexo/source/_posts/Architecture架构/h5js/common_js/url_util.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/// 获取指定地址的主地址
function getRequestUrlMain(browserUrl) {
  if (browserUrl == null || browserUrl == "" || typeof browserUrl == "undefined") {
    var url = decodeURI(location.search);  //获取url中"?"符后的字串
  } else {
    var url = browserUrl;
  }

  var url_main;
  var paramStartIndex = url.indexOf("?");
  if (paramStartIndex != -1) {
    // [js中截取字符串的三个方法 substring()、substr()、slice()](https://segmentfault.com/a/1190000016387899)
     url_main = url.substring(0, paramStartIndex);
  } else {
     url_main = url;
  }
  return url_main;
}

/// 获取指定地址的所有参数
function getRequestUrlParams(browserUrl) {
  if (browserUrl == null || browserUrl == "" || typeof browserUrl == "undefined") {
    var url = decodeURI(location.search);  //获取url中"?"符后的字串
  } else {
    var url = browserUrl;
  }

  var theRequest = new Map();
  var paramStartIndex = url.indexOf("?");
  if (paramStartIndex != -1) {
    var str = url.substr(paramStartIndex + 1);
    strs = str.split("&");

    for (var i = 0; i < strs.length; i++) {
      var keyValueComponent = strs[i].split("=");
      var key = keyValueComponent[0];
      var value = keyValueComponent[1];
      theRequest[key] = unescape(value);
    }
  }
  return theRequest;
}

// [js获取url中的中文参数出现乱码解决](https://www.codeleading.com/article/87533774933/)
// "http://localhost:4000/Architecture%E6%9E%B6%E6%9E%84/h5js/dvlp_h5js_demo/dvlp_h5js_demo.json"; // url含中文示例
// "http://localhost/test/test.html?p=广东&c=珠海"
function getValueByQueryKey(browserUrl, key) {
  // 获取参数
  if (browserUrl == null || browserUrl == "" || typeof browserUrl == "undefined") {
    var url = decodeURI(location.search);  //获取url中"?"符后的字串
    // var url = window.location.search; // 在本地用file打开，而不是http打开的话，此值会为空
  } else {
    var url = browserUrl;
  }
  
  // 正则筛选地址栏
  var reg = new RegExp("(^|&)" + key + "=([^&]*)(&|$)");
  // 匹配目标参数
  var result = url.substr(1).match(reg);
  //返回参数值
  // return result ? unescape(result[2]) : null; // url中含中文时候，取值会出错
  return result ? decodeURIComponent(result[2]) : null;
}

/// 获取本页面指定参数key的值
function getQueryString(key) {
  var url = window.location.search; // 在本地用file打开，而不是http打开的话，此值会为空
  return getValueByQueryKey(url, key);
}