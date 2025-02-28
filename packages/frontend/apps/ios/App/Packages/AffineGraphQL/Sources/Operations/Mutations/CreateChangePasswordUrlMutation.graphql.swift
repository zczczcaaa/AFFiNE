// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class CreateChangePasswordUrlMutation: GraphQLMutation {
  public static let operationName: String = "createChangePasswordUrl"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"mutation createChangePasswordUrl($callbackUrl: String!, $userId: String!) { createChangePasswordUrl(callbackUrl: $callbackUrl, userId: $userId) }"#
    ))

  public var callbackUrl: String
  public var userId: String

  public init(
    callbackUrl: String,
    userId: String
  ) {
    self.callbackUrl = callbackUrl
    self.userId = userId
  }

  public var __variables: Variables? { [
    "callbackUrl": callbackUrl,
    "userId": userId
  ] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Mutation }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("createChangePasswordUrl", String.self, arguments: [
        "callbackUrl": .variable("callbackUrl"),
        "userId": .variable("userId")
      ]),
    ] }

    /// Create change password url
    public var createChangePasswordUrl: String { __data["createChangePasswordUrl"] }
  }
}
