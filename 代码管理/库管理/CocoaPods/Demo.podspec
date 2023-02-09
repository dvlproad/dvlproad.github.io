Pod::Spec.new do |s|
  s.name         = "RadioButtons"
  s.version      = "2.1.2"
  s.summary      = "单选按钮的组合RadioButtons"
  s.homepage     = "https://github.com/dvlproad/RadioButtons"
  s.license      = "MIT"
  s.author             = "dvlproad"
  # s.social_media_url   = "http://twitter.com/dvlproad"

  s.platform     = :ios, "7.0"

  s.source       = { :git => "https://github.com/dvlproad/RadioButtons.git", :tag => "2.1.2" }
  s.source_files  = "RadioButtons/**/*.{h,m}"
  s.resources = "RadioButtons/**/*.{png,xib}"
  s.frameworks = 'UIKit'

  # s.library   = "iconv"
  # s.libraries = "iconv", "xml2"
  # s.vendored_libraries = '/Pod/Classes/*.a' #代码中包含静态库

  s.requires_arc = true

  # s.xcconfig = { "HEADER_SEARCH_PATHS" => "$(SDKROOT)/usr/include/libxml2" }
  # s.dependency "JSONKit", "~> 1.4"

  s.subspec 'ServiceHelp' do |ss|
    ss.source_files = "ServiceHelp/**/*.{h,m}"
  end

end
