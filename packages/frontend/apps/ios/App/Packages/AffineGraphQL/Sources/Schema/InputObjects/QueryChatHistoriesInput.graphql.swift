// @generated
// This file was automatically generated and should not be edited.

import ApolloAPI

public struct QueryChatHistoriesInput: InputObject {
  public private(set) var __data: InputDict

  public init(_ data: InputDict) {
    __data = data
  }

  public init(
    action: GraphQLNullable<Bool> = nil,
    fork: GraphQLNullable<Bool> = nil,
    limit: GraphQLNullable<Int> = nil,
    messageOrder: GraphQLNullable<GraphQLEnum<ChatHistoryOrder>> = nil,
    sessionId: GraphQLNullable<String> = nil,
    sessionOrder: GraphQLNullable<GraphQLEnum<ChatHistoryOrder>> = nil,
    skip: GraphQLNullable<Int> = nil
  ) {
    __data = InputDict([
      "action": action,
      "fork": fork,
      "limit": limit,
      "messageOrder": messageOrder,
      "sessionId": sessionId,
      "sessionOrder": sessionOrder,
      "skip": skip
    ])
  }

  public var action: GraphQLNullable<Bool> {
    get { __data["action"] }
    set { __data["action"] = newValue }
  }

  public var fork: GraphQLNullable<Bool> {
    get { __data["fork"] }
    set { __data["fork"] = newValue }
  }

  public var limit: GraphQLNullable<Int> {
    get { __data["limit"] }
    set { __data["limit"] = newValue }
  }

  public var messageOrder: GraphQLNullable<GraphQLEnum<ChatHistoryOrder>> {
    get { __data["messageOrder"] }
    set { __data["messageOrder"] = newValue }
  }

  public var sessionId: GraphQLNullable<String> {
    get { __data["sessionId"] }
    set { __data["sessionId"] = newValue }
  }

  public var sessionOrder: GraphQLNullable<GraphQLEnum<ChatHistoryOrder>> {
    get { __data["sessionOrder"] }
    set { __data["sessionOrder"] = newValue }
  }

  public var skip: GraphQLNullable<Int> {
    get { __data["skip"] }
    set { __data["skip"] = newValue }
  }
}
