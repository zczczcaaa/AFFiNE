//
//  PlainTextEditView.swift
//  Intelligents
//
//  Created by 秋星桥 on 2024/11/18.
//

import UIKit

class PlainTextEditView: UITextView, UITextViewDelegate {
  init() {
    super.init(frame: .zero, textContainer: nil)

    delegate = self
    tintColor = .accent

    linkTextAttributes = [:]
    showsVerticalScrollIndicator = false
    showsHorizontalScrollIndicator = false
    textContainer.lineFragmentPadding = .zero
    textAlignment = .natural
    backgroundColor = .clear
    textContainerInset = .zero
    textContainer.lineBreakMode = .byTruncatingTail
    isScrollEnabled = false
    clipsToBounds = false

    isEditable = true
    isSelectable = true
    isScrollEnabled = false
  }

  @available(*, unavailable)
  required init?(coder _: NSCoder) {
    fatalError()
  }
}
