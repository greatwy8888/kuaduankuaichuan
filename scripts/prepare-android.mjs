import { cp, mkdir, copyFile, readFile, writeFile, appendFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
const root='android/app/src/main';
await mkdir('www', { recursive: true });
for (const file of ['index.html','styles.css','app.js','manifest.webmanifest']) await copyFile(file, 'www/' + file);
if (existsSync('assets')) await cp('assets','www/assets',{recursive:true});
if (existsSync('node_modules/qrcode/build/qrcode.js')) await copyFile('node_modules/qrcode/build/qrcode.js','www/qrcode.js');
if (existsSync(root+'/AndroidManifest.xml')) {
 let xml=await readFile(root+'/AndroidManifest.xml','utf8');
 for (const permission of ['android.permission.INTERNET','android.permission.ACCESS_NETWORK_STATE','android.permission.ACCESS_WIFI_STATE']) if (!xml.includes('android:name="'+permission+'"')) xml=xml.replace('<application', '<uses-permission android:name="'+permission+'"/>\n    <application');
 await writeFile(root+'/AndroidManifest.xml',xml);
}
const gradle='android/app/build.gradle';
if (existsSync(gradle)) {
 let g=await readFile(gradle,'utf8');
 if (!g.includes('org.nanohttpd:nanohttpd')) g=g.replace('dependencies {', 'dependencies {\n    implementation "org.nanohttpd:nanohttpd:2.3.1"');
 await writeFile(gradle,g);
}
const javaDir=root+'/java/com/greatwy8888/kuaduankuaichuan';
await mkdir(javaDir,{recursive:true});
const pluginPath=javaDir+'/LanTransferPlugin.java';
await writeFile(pluginPath, `package com.greatwy8888.kuaduankuaichuan;

import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import fi.iki.elonen.NanoHTTPD;
import java.io.*;
import java.net.*;
import java.util.*;

@CapacitorPlugin(name = "LanTransfer")
public class LanTransferPlugin extends Plugin {
  private ReceiverServer server;
  @PluginMethod public void startReceiver(PluginCall call) {
    try {
      if (server == null || !server.isAlive()) {
        String token = UUID.randomUUID().toString().replace("-", "");
        server = new ReceiverServer(token);
        server.start(NanoHTTPD.SOCKET_READ_TIMEOUT, false);
      }
      JSObjectCompat.resolve(call, server.getUrl());
    } catch (Exception e) { call.reject("无法启动接收服务：" + e.getMessage()); }
  }
  @PluginMethod public void stopReceiver(PluginCall call) {
    if (server != null) { server.stop(); server = null; }
    call.resolve();
  }
  private String getIp() {
    try {
      for (Enumeration<NetworkInterface> e=NetworkInterface.getNetworkInterfaces(); e.hasMoreElements();) {
        NetworkInterface ni=e.nextElement();
        for (Enumeration<InetAddress> a=ni.getInetAddresses(); a.hasMoreElements();) {
          InetAddress ip=a.nextElement();
          if (!ip.isLoopbackAddress() && ip instanceof Inet4Address) return ip.getHostAddress();
        }
      }
    } catch(Exception ignored) {}
    return "127.0.0.1";
  }
  private final class ReceiverServer extends NanoHTTPD {
    private final String token;
    ReceiverServer(String token) { super("0.0.0.0", 8765); this.token=token; }
    String getUrl() { return "http://"+getIp()+":8765/?token="+token; }
    @Override public Response serve(IHTTPSession session) {
      String supplied=session.getParms().get("token");
      if (session.getMethod()==Method.GET && "/".equals(session.getUri())) {
        String html="<!doctype html><meta name='viewport' content='width=device-width,initial-scale=1'><meta charset='utf-8'><title>跨端快传</title><body style='font:16px sans-serif;max-width:600px;margin:40px auto;padding:16px'><h2>发送文件到这台手机</h2><p>选择文件后将通过局域网发送到接收手机。</p><input id='f' type='file' multiple><button onclick='send()'>发送文件</button><p id='s'></p><script>async function send(){let fs=document.getElementById('f').files,s=document.getElementById('s');for(let f of fs){s.textContent='正在发送 '+f.name;let r=await fetch('/upload?token='+new URLSearchParams(location.search).get('token')+'&name='+encodeURIComponent(f.name),{method:'PUT',body:f});if(!r.ok){s.textContent='失败：'+f.name;return}}s.textContent='发送完成，共 '+fs.length+' 个文件'}</script></body>";
        return newFixedLengthResponse(Response.Status.OK,"text/html; charset=utf-8",html);
      }
      if (!token.equals(supplied)) return newFixedLengthResponse(Response.Status.FORBIDDEN,"text/plain","配对码无效");
      if (session.getMethod()==Method.PUT && "/upload".equals(session.getUri())) {
        try {
          Map<String,String> files=new HashMap<>(); session.parseBody(files);
          String temp=files.get("postData"); if(temp==null) return newFixedLengthResponse(Response.Status.BAD_REQUEST,"text/plain","缺少文件内容");
          String name=session.getParms().get("name"); if(name==null||name.trim().isEmpty()) name="received-file";
          name=name.replaceAll("[\\\\\\\\/:*?\\\"<>|\\\\x00-\\\\x1f]","_"); if(name.length()>160) name=name.substring(0,160);
          ContentValues values=new ContentValues(); values.put(MediaStore.Downloads.DISPLAY_NAME,name); values.put(MediaStore.Downloads.MIME_TYPE,"application/octet-stream");
          if(Build.VERSION.SDK_INT>=29) values.put(MediaStore.Downloads.RELATIVE_PATH,"Download/跨端快传");
          Uri uri=getContext().getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,values);
          if(uri==null) throw new IOException("无法创建下载文件");
          try(InputStream in=new FileInputStream(temp);OutputStream out=getContext().getContentResolver().openOutputStream(uri)){byte[] b=new byte[65536];int n;while((n=in.read(b))>0)out.write(b,0,n);}
          new File(temp).delete();
          return newFixedLengthResponse(Response.Status.OK,"text/plain; charset=utf-8","OK");
        } catch(Exception e) { return newFixedLengthResponse(Response.Status.INTERNAL_ERROR,"text/plain; charset=utf-8","保存失败："+e.getMessage()); }
      }
      return newFixedLengthResponse(Response.Status.NOT_FOUND,"text/plain","Not found");
    }
  }
  private static final class JSObjectCompat {
    static void resolve(PluginCall call, String url) { com.getcapacitor.JSObject result=new com.getcapacitor.JSObject(); result.put("url",url); call.resolve(result); }
  }
}
`);
const activity=javaDir+'/MainActivity.java';
if (existsSync(activity)) {
 let a=await readFile(activity,'utf8');
 if (!a.includes('LanTransferPlugin')) {
   a=a.replace('import com.getcapacitor.BridgeActivity;', 'import com.getcapacitor.BridgeActivity;\nimport com.greatwy8888.kuaduankuaichuan.LanTransferPlugin;');
   a=a.replace('public class MainActivity extends BridgeActivity {', 'public class MainActivity extends BridgeActivity {\n  @Override public void onCreate(android.os.Bundle savedInstanceState) {\n    registerPlugin(LanTransferPlugin.class);\n    super.onCreate(savedInstanceState);\n  }');
   await writeFile(activity,a);
 }
}
console.log('Android assets and native LAN receiver prepared.');
