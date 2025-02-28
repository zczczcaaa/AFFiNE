// @generated
// This file was automatically generated and should not be edited.

@_exported import ApolloAPI

public class GetInviteInfoQuery: GraphQLQuery {
  public static let operationName: String = "getInviteInfo"
  public static let operationDocument: ApolloAPI.OperationDocument = .init(
    definition: .init(
      #"query getInviteInfo($inviteId: String!) { getInviteInfo(inviteId: $inviteId) { __typename workspace { __typename id name avatar } user { __typename id name avatarUrl } } }"#
    ))

  public var inviteId: String

  public init(inviteId: String) {
    self.inviteId = inviteId
  }

  public var __variables: Variables? { ["inviteId": inviteId] }

  public struct Data: AffineGraphQL.SelectionSet {
    public let __data: DataDict
    public init(_dataDict: DataDict) { __data = _dataDict }

    public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.Query }
    public static var __selections: [ApolloAPI.Selection] { [
      .field("getInviteInfo", GetInviteInfo.self, arguments: ["inviteId": .variable("inviteId")]),
    ] }

    /// send workspace invitation
    public var getInviteInfo: GetInviteInfo { __data["getInviteInfo"] }

    /// GetInviteInfo
    ///
    /// Parent Type: `InvitationType`
    public struct GetInviteInfo: AffineGraphQL.SelectionSet {
      public let __data: DataDict
      public init(_dataDict: DataDict) { __data = _dataDict }

      public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.InvitationType }
      public static var __selections: [ApolloAPI.Selection] { [
        .field("__typename", String.self),
        .field("workspace", Workspace.self),
        .field("user", User.self),
      ] }

      /// Workspace information
      public var workspace: Workspace { __data["workspace"] }
      /// User information
      public var user: User { __data["user"] }

      /// GetInviteInfo.Workspace
      ///
      /// Parent Type: `InvitationWorkspaceType`
      public struct Workspace: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.InvitationWorkspaceType }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", AffineGraphQL.ID.self),
          .field("name", String.self),
          .field("avatar", String.self),
        ] }

        public var id: AffineGraphQL.ID { __data["id"] }
        /// Workspace name
        public var name: String { __data["name"] }
        /// Base64 encoded avatar
        public var avatar: String { __data["avatar"] }
      }

      /// GetInviteInfo.User
      ///
      /// Parent Type: `UserType`
      public struct User: AffineGraphQL.SelectionSet {
        public let __data: DataDict
        public init(_dataDict: DataDict) { __data = _dataDict }

        public static var __parentType: any ApolloAPI.ParentType { AffineGraphQL.Objects.UserType }
        public static var __selections: [ApolloAPI.Selection] { [
          .field("__typename", String.self),
          .field("id", AffineGraphQL.ID.self),
          .field("name", String.self),
          .field("avatarUrl", String?.self),
        ] }

        public var id: AffineGraphQL.ID { __data["id"] }
        /// User name
        public var name: String { __data["name"] }
        /// User avatar url
        public var avatarUrl: String? { __data["avatarUrl"] }
      }
    }
  }
}
