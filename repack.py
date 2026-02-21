#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Tampermonkey脚本二次打包工具
将分离的CSS和JS文件合并为单一的用户脚本文件
"""

import os
import re
import sys
from pathlib import Path

def read_file(file_path):
    """读取文件内容"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"读取文件失败 {file_path}: {e}")
        return None

def write_file(file_path, content):
    """写入文件内容"""
    try:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"文件写入成功: {file_path}")
        return True
    except Exception as e:
        print(f"写入文件失败 {file_path}: {e}")
        return False

def extract_userscript_header(js_content):
    """提取用户脚本头部信息"""
    header_match = re.search(r'(// ==UserScript==.*?// ==/UserScript==)', js_content, re.DOTALL)
    if header_match:
        return header_match.group(1)
    return None

def extract_header_from_vite_config():
    """从vite.config.js中提取油猴脚本头部信息"""
    try:
        vite_config_path = Path('vite.config.js')
        if not vite_config_path.exists():
            return None
        
        config_content = read_file(vite_config_path)
        if not config_content:
            return None
        
        # 提取banner中的油猴脚本头部
        banner_match = re.search(r'banner:\s*`(// ==UserScript==.*?// ==/UserScript==)', config_content, re.DOTALL)
        if banner_match:
            return banner_match.group(1)
        
        return None
    except Exception as e:
        print(f"从vite.config.js提取头部信息失败: {e}")
        return None

def remove_userscript_header(js_content):
    """移除用户脚本头部信息"""
    return re.sub(r'// ==UserScript==.*?// ==/UserScript==\s*', '', js_content, flags=re.DOTALL)

def inject_css_into_js(js_content, css_content):
    """将CSS内容注入到JS文件中"""
    # 转义CSS内容中的特殊字符
    css_escaped = css_content.replace('\\', '\\\\').replace('`', '\\`').replace('${', '\\${')
    
    # 创建CSS注入代码
    css_injection = f'''
// 注入CSS样式
(function() {{
    const style = document.createElement('style');
    style.textContent = `{css_escaped}`;
    document.head.appendChild(style);
}})();
'''
    
    # 在JS代码开始处注入CSS
    # 查找第一个非注释的代码行
    lines = js_content.split('\n')
    insert_index = 0
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        if stripped and not stripped.startswith('//') and not stripped.startswith('/*'):
            insert_index = i
            break
    
    # 插入CSS注入代码
    lines.insert(insert_index, css_injection)
    return '\n'.join(lines)

def repack_tampermonkey_script():
    """重新打包Tampermonkey脚本"""
    # 定义文件路径
    dist_dir = Path('dist')
    js_file = dist_dir / 'bilibili-window.user.js'
    css_file = dist_dir / 'style.css'
    output_file = 'bilibili-window-packed.user.js'
    
    # 检查文件是否存在
    if not js_file.exists():
        print(f"错误: JS文件不存在 {js_file}")
        return False
    
    css_exists = css_file.exists()
    
    # 读取文件内容
    print("读取JS文件...")
    js_content = read_file(js_file)
    if js_content is None:
        return False
    
    css_content = None
    if css_exists:
        print("读取CSS文件...")
        css_content = read_file(css_file)
        if css_content is None:
            return False
    
    # 提取用户脚本头部
    print("提取用户脚本头部信息...")
    header = extract_userscript_header(js_content)
    if not header:
        print("从JS文件中未找到用户脚本头部信息，尝试从vite.config.js中提取...")
        header = extract_header_from_vite_config()
        if not header:
            print("警告: 未找到用户脚本头部信息")
            header = ''
        else:
            print("成功从vite.config.js中提取头部信息")
    else:
        print("成功从JS文件中提取头部信息")
    
    # 移除原始头部
    js_content_clean = remove_userscript_header(js_content)
    
    # 注入CSS到JS中
    if css_content:
        print("将CSS注入到JS中...")
        js_with_css = inject_css_into_js(js_content_clean, css_content)
    else:
        print("未找到CSS文件，使用JS内置样式")
        js_with_css = js_content_clean
    
    # 组合最终内容
    final_content = header + '\n' + js_with_css if header else js_with_css
    
    # 写入输出文件
    print(f"写入打包后的文件: {output_file}")
    success = write_file(output_file, final_content)
    
    if success:
        # 显示文件大小信息
        original_size = js_file.stat().st_size + (css_file.stat().st_size if css_exists else 0)
        packed_size = Path(output_file).stat().st_size
        
        print(f"\n打包完成!")
        if css_exists:
            print(f"原始文件大小: {original_size:,} 字节 (JS: {js_file.stat().st_size:,} + CSS: {css_file.stat().st_size:,})")
        else:
            print(f"原始文件大小: {original_size:,} 字节 (JS: {js_file.stat().st_size:,})")
        print(f"打包后大小: {packed_size:,} 字节")
        print(f"大小变化: {packed_size - original_size:+,} 字节")
        print(f"\n请将 {output_file} 安装到Tampermonkey中")
        
        return True
    
    return False

def main():
    """主函数"""
    print("Tampermonkey脚本二次打包工具")
    print("=" * 40)
    
    # 检查当前目录
    if not Path('dist').exists():
        print("错误: 当前目录下没有找到 dist 文件夹")
        print("请确保在项目根目录下运行此脚本")
        sys.exit(1)
    
    # 执行打包
    success = repack_tampermonkey_script()
    
    if success:
        print("\n[SUCCESS] 打包成功!")
        sys.exit(0)
    else:
        print("\n[ERROR] 打包失败!")
        sys.exit(1)

if __name__ == '__main__':
    main()
