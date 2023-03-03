/*
 * @Author: dvlproad
 * @Date: 2023-03-03 13:48:36
 * @LastEditors: dvlproad
 * @LastEditTime: 2023-03-03 13:49:43
 * @Description: 
 */

function readJson(url) {
    return new Promise((resolve, reject) => {
      $.ajax({
        url: url,//同文件夹下的json文件路径
        type: "GET",//请求方式为get
        dataType: "json", //返回数据格式为json
        success: function (data) {//请求成功完成后要执行的方法 
          console.log(`读取${url}成功,数据data的值为\n${data}`);
          console.log(`读取${url}成功,数据data转字符串后的值为\n${JSON.stringify(data)}`);

          // var array = data;
          // for (let index = 0; index < array.length; index++) { //循环后台传过来的Json数组 
          //   const element = array[index];
          //   console.log(`data${index}:` + element);
          //   console.log(`data${index}:` + element.h5CallBridgeActionDes);
          // }
          resolve(data);
        },
        error: function (err) {
          // debugger // 断点调试
          resolve(null);
        }

      })
    })
    // $.get('./test_h5js_demo.json', function (data) {

    //   //读进了data变量中
    //   //接下来用到data的代码必须全部在此函数内部进行
    //   console.log("data:" + data);
    // });



    // d3.json('./test_h5js_demo.json', function (error, authordata) {
    //   if (error) console.error(error);
    //   //读进了authordata变量
    //   //接下来用到authordata的代码必须全部在此函数内部进行
    //   console.log("data:" + data);
    // });
    // if (window.FileReader) {
    //   let reader = new FileReader();
    //   let file = new File(
    //     [blob],
    //     url,
    //     {
    //       type: 'text/plain',
    //     }
    //   );
    //   reader.readAsText(file);
    //   reader.onload = function () {
    //     console.log('读取成功');
    //     var data = reader.result;   //base64形式的文件内容
    //   };
    //   reader.onerror = function () {
    //     console.log('读取失败');
    //     console.log(reader.error);
    //   }
    // } else {
    //   console.log('你的浏览器不支持读取文件');
    // }
  }