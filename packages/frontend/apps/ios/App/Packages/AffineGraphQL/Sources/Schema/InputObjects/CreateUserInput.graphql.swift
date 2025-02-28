// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public struct CreateUserInput: InputObject {
  public private(set) var __data: InputDict

  public init(_ data: InputDict) {
    __data = data
  }

  public init(
    email: String,
    name: GraphQLNullable<String> = nil
  ) {
    __data = InputDict([
      "email": email,
      "name": name
    ])
  }

  public var email: String {
    get { __data["email"] }
    set { __data["email"] = newValue }
  }

  public var name: GraphQLNullable<String> {
    get { __data["name"] }
    set { __data["name"] = newValue }
  }
}
